'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { useVendors } from '../../../context/VendorsContext';
import { useLocations } from '../../../context/LocationsContext';
import { useSchedules } from '../../../context/SchedulesContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';
import { LocationBadge } from '../../components/LocationBadge';

// Location and Vendor types now come from shared contexts

interface Schedule {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  vendorId: string;
  vendor?: {
    displayName: string;
  };
  scheduleType: 'DAILY' | 'WEEKLY';
  dayOfWeek?: number;
  triggerTime: string;
  slackChannel?: string;
  isActive: boolean;
  createdAt: string;
}

interface GroupTriggerItem {
  id?: string;
  scheduleType: 'DAILY' | 'WEEKLY';
  dayOfWeek: number;
  triggerTime: string;
  isActive: boolean;
  isDeleted?: boolean;
}

interface ScheduleGroup {
  key: string;
  locationId: string;
  vendorId: string;
  locationName: string;
  vendorName: string;
  items: Schedule[];
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function SchedulesPage() {
  const { vendors, vendorsLoading } = useVendors();
  const { locations, locationsLoading } = useLocations();
  const { schedules, schedulesLoading, refreshSchedules } = useSchedules();
  const { selectedLocationId, selectedLocation } = useLocationFilter();

  const [error, setError] = useState('');

  // Group Form State
  const [editingGroup, setEditingGroup] = useState<ScheduleGroup | null>(null);
  const [locationId, setLocationId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [groupTriggers, setGroupTriggers] = useState<GroupTriggerItem[]>([]);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  // locationFilter is now driven by the global navbar dropdown (selectedLocationId)
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('location');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  // Triggering State
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('tile');
    }
  }, []);

  // schedules data comes from SchedulesContext — no local fetch needed

  const handleOpenCreateModal = () => {
    setEditingGroup(null);
    setError('');
    const defaultLoc = locations[0]?.id || '';
    const defaultVendor = (vendors[0] as any)?.id || '';
    setLocationId(defaultLoc);
    setVendorId(defaultVendor);
    setGroupTriggers([
      { scheduleType: 'DAILY', dayOfWeek: 1, triggerTime: '09:00', isActive: true }
    ]);
    setShowModal(true);
  };

  const handleOpenGroupEditModal = (group: ScheduleGroup) => {
    setEditingGroup(group);
    setError('');
    setLocationId(group.locationId);
    setVendorId(group.vendorId);
    setGroupTriggers(group.items.map(s => ({
      id: s.id,
      scheduleType: s.scheduleType,
      dayOfWeek: s.dayOfWeek ?? 1,
      triggerTime: s.triggerTime,
      isActive: s.isActive,
    })));
    setShowModal(true);
  };

  const handleAddTriggerRow = () => {
    setGroupTriggers(prev => [
      ...prev,
      { scheduleType: 'DAILY', dayOfWeek: 1, triggerTime: '09:00', isActive: true }
    ]);
  };

  const handleUpdateTriggerRow = (index: number, updates: Partial<GroupTriggerItem>) => {
    setGroupTriggers(prev => prev.map((t, idx) => idx === index ? { ...t, ...updates } : t));
  };

  const handleRemoveTriggerRow = (index: number) => {
    setGroupTriggers(prev => {
      const item = prev[index];
      if (item.id) {
        return prev.map((t, idx) => idx === index ? { ...t, isDeleted: true } : t);
      } else {
        return prev.filter((_, idx) => idx !== index);
      }
    });
  };

  const handleDeleteGroup = async (group: ScheduleGroup) => {
    if (!confirm(`Are you sure you want to delete all triggers for ${group.vendorName} at ${group.locationName}?`)) return;
    setError('');
    try {
      await Promise.all(group.items.map(s => api.schedules.delete(s.id)));
      setSuccessMessage('Schedules deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      await refreshSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedules.');
    }
  };

  const handleTriggerGroup = async (group: ScheduleGroup) => {
    const targetSchedule = group.items.find(s => s.isActive) || group.items[0];
    if (!targetSchedule) {
      setError('No triggers found in this group.');
      return;
    }
    setTriggeringId(group.items[0]?.id || targetSchedule.id);
    setError('');
    setSuccessMessage('');
    try {
      await api.schedules.trigger(targetSchedule.id);
      setSuccessMessage(`Schedule manually triggered for ${group.vendorName}! Stock audit generated & Slack notification sent.`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger schedule.');
    } finally {
      setTriggeringId(null);
    }
  };

  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !vendorId) {
      setError('Please ensure locations and vendors exist.');
      return;
    }

    const activeTriggers = groupTriggers.filter(t => !t.isDeleted);
    if (activeTriggers.length === 0) {
      setError('Please configure at least one trigger.');
      return;
    }

    setFormSubmitting(true);
    setError('');

    try {
      const tasks: Promise<any>[] = [];

      // Process deletions
      groupTriggers.forEach(t => {
        if (t.isDeleted && t.id) {
          tasks.push(api.schedules.delete(t.id));
        }
      });

      // Process updates and creations
      activeTriggers.forEach(t => {
        if (t.id) {
          tasks.push(api.schedules.update(t.id, {
            locationId,
            vendorId,
            scheduleType: t.scheduleType,
            dayOfWeek: t.scheduleType === 'WEEKLY' ? Number(t.dayOfWeek) : undefined,
            triggerTime: t.triggerTime,
            isActive: t.isActive,
          }));
        } else {
          tasks.push(api.schedules.create({
            locationId,
            vendorId,
            scheduleType: t.scheduleType,
            dayOfWeek: t.scheduleType === 'WEEKLY' ? Number(t.dayOfWeek) : undefined,
            triggerTime: t.triggerTime,
          }));
        }
      });

      await Promise.all(tasks);
      setSuccessMessage('All schedule triggers saved successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      setShowModal(false);
      await refreshSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule triggers.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="page-container">
        {/* Pinned Top Bar */}
        <div className="page-header-sticky">
          {/* Navigation Breadcrumbs */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Schedules & Triggers</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div className="page-header-text">
              <h1>Ordering Schedules & Triggers <LocationBadge /></h1>
              <p>Configure automated Slack notification schedules and multiple triggers for storefront stock audits.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Add New Trigger
            </button>
          </div>

          {error && !showModal && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Filter / Sort / View Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Location is filtered globally from the navbar dropdown */}
            {selectedLocationId !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 500 }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {locations.find(l => l.id === selectedLocationId)?.name || 'Selected Location'}
              </div>
            )}
            <select className="input" style={{ flex: '1 1 200px', minWidth: '180px' }} value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
              <option value="all">All Vendors</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
            </select>
            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginLeft: 'auto' }}>
              <button type="button" onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 15.75v2.25A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              </button>
              <button type="button" onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Schedules list */}
        {schedulesLoading ? (
          <div className="page-content-scroll">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '24px'
            }}>
              {[1, 2].map((i) => (
                <div key={i} className="card animate-pulse" style={{ padding: '24px', height: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="skeleton" style={{ height: '20px', width: '30%' }} />
                  <div className="skeleton" style={{ height: '24px', width: '70%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '50%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          (() => {
            const filtered = schedules.filter(s => {
              if (selectedLocationId !== 'all' && s.locationId !== selectedLocationId) return false;
              if (vendorFilter !== 'all' && s.vendorId !== vendorFilter) return false;
              return true;
            });

            // Group schedules by locationId & vendorId combination
            const groupedMap = new Map<string, ScheduleGroup>();

            filtered.forEach(s => {
              const key = `${s.locationId}-${s.vendorId}`;
              if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                  key,
                  locationId: s.locationId,
                  vendorId: s.vendorId,
                  locationName: s.location?.name || 'Unknown Location',
                  vendorName: s.vendor?.displayName || 'Unknown Vendor',
                  items: []
                });
              }
              groupedMap.get(key)!.items.push(s);
            });

            // Sort triggers chronologically within each group (Monday -> Sunday, then trigger time)
            groupedMap.forEach(group => {
              group.items.sort((a, b) => {
                const dayA = a.dayOfWeek !== undefined ? (a.dayOfWeek === 0 ? 7 : a.dayOfWeek) : -1;
                const dayB = b.dayOfWeek !== undefined ? (b.dayOfWeek === 0 ? 7 : b.dayOfWeek) : -1;
                if (dayA !== dayB) {
                  return dayA - dayB;
                }
                return (a.triggerTime || '').localeCompare(b.triggerTime || '');
              });
            });

            const groups = Array.from(groupedMap.values()).sort((a, b) => {
              let cmp = 0;
              if (sortColumn === 'location') {
                cmp = a.locationName.localeCompare(b.locationName);
              } else if (sortColumn === 'vendor') {
                cmp = a.vendorName.localeCompare(b.vendorName);
              } else if (sortColumn === 'type') {
                const typeA = a.items[0]?.scheduleType || '';
                const typeB = b.items[0]?.scheduleType || '';
                cmp = typeA.localeCompare(typeB);
              } else if (sortColumn === 'time') {
                const timeA = a.items[0]?.triggerTime || '';
                const timeB = b.items[0]?.triggerTime || '';
                cmp = timeA.localeCompare(timeB);
              } else if (sortColumn === 'slack') {
                const slackA = a.items[0]?.slackChannel || '';
                const slackB = b.items[0]?.slackChannel || '';
                cmp = slackA.localeCompare(slackB);
              } else if (sortColumn === 'status') {
                const statusA = a.items.some(i => i.isActive) ? 'Active' : 'Inactive';
                const statusB = b.items.some(i => i.isActive) ? 'Active' : 'Inactive';
                cmp = statusA.localeCompare(statusB);
              }
              return sortDir === 'asc' ? cmp : -cmp;
            });

            if (groups.length === 0) return (
              <div className="page-content-scroll">
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state"><h3>No results found</h3><p>Try adjusting your search or filter.</p></div>
                </div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div className="page-content-scroll">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
                  gap: '24px'
                }} className="stagger">
                {groups.map((group) => {
                  return (
                    <div
                      key={group.key}
                      className="card card-hover"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Accent element */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '80px',
                        height: '80px',
                        background: 'var(--accent-subtle)',
                        borderRadius: '50%',
                        filter: 'blur(30px)',
                        marginRight: '-20px',
                        marginTop: '-20px',
                        pointerEvents: 'none'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STORE LOCATION</span>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {group.locationName}
                          </h3>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', display: 'block' }}>WHOLESALE VENDOR</span>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', marginTop: '2px' }}>
                            {group.vendorName}
                          </h3>
                        </div>
                        <span className="badge badge-purple" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                          {group.items.length} {group.items.length === 1 ? 'Trigger' : 'Triggers'}
                        </span>
                      </div>

                      {/* Triggers list summary */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configured Triggers</span>
                        {group.items.map((schedule) => (
                          <div
                            key={schedule.id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-base)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className={`badge ${schedule.scheduleType === 'DAILY' ? 'badge-amber' : 'badge-teal'}`} style={{ fontSize: '0.6875rem' }}>
                                {schedule.scheduleType}
                              </span>
                              <span className="mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {schedule.triggerTime.substring(0, 5)}
                                {schedule.scheduleType === 'WEEKLY' && schedule.dayOfWeek !== undefined && ` (${DAYS_OF_WEEK[schedule.dayOfWeek]})`}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {schedule.slackChannel && (
                                <span className="mono" style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)', padding: '1px 4px', borderRadius: '3px', fontSize: '0.6875rem' }}>
                                  #{schedule.slackChannel}
                                </span>
                              )}
                              <span className={`badge ${schedule.isActive ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                                <span className="badge-dot" style={{ backgroundColor: schedule.isActive ? 'var(--green)' : 'var(--text-tertiary)' }} />
                                {schedule.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Single Action Bar for Group */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenGroupEditModal(group)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                          >
                            ✏️ Edit Triggers
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '0.8125rem', color: 'var(--red)' }}
                            title="Delete all triggers for this vendor"
                          >
                            🗑️
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTriggerGroup(group)}
                          disabled={triggeringId === group.items[0]?.id}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                        >
                          ⚡ {triggeringId === group.items[0]?.id ? 'Triggering...' : 'Trigger Now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ) : (
              <div className="table-scroll-container">
                <div className="table-responsive-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th
                          onClick={() => handleSort('location')}
                          style={{ paddingLeft: '24px', cursor: 'pointer', userSelect: 'none' }}
                        >
                          Store Location {sortColumn === 'location' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          onClick={() => handleSort('vendor')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Wholesale Vendor {sortColumn === 'vendor' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          onClick={() => handleSort('type')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Schedule Triggers {sortColumn === 'type' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          onClick={() => handleSort('time')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Trigger Time {sortColumn === 'time' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          onClick={() => handleSort('slack')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Slack Channel {sortColumn === 'slack' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th
                          onClick={() => handleSort('status')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                          Status {sortColumn === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => {
                        return (
                          <tr key={group.key}>
                            <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {group.locationName}
                            </td>
                            <td style={{ color: 'var(--accent)', fontWeight: 500 }}>
                              {group.vendorName}
                              {group.items.length > 1 && (
                                <span className="badge badge-purple" style={{ marginLeft: '8px', fontSize: '0.6875rem' }}>
                                  {group.items.length} Triggers
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {group.items.map(s => (
                                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className={`badge ${s.scheduleType === 'DAILY' ? 'badge-amber' : 'badge-teal'}`} style={{ fontSize: '0.6875rem' }}>
                                      {s.scheduleType}
                                    </span>
                                    {s.scheduleType === 'WEEKLY' && s.dayOfWeek !== undefined && (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {DAYS_OF_WEEK[s.dayOfWeek]}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {group.items.map(s => (
                                  <div key={s.id}>
                                    {s.triggerTime.substring(0, 5)}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="mono" style={{ fontSize: '0.8125rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {group.items.map(s => (
                                  <div key={s.id}>
                                    {s.slackChannel ? `#${s.slackChannel}` : '-'}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {group.items.map(s => (
                                  <div key={s.id}>
                                    <span className={`badge ${s.isActive ? 'badge-green' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                                      <span className="badge-dot" style={{ backgroundColor: s.isActive ? 'var(--green)' : 'var(--text-tertiary)' }} />
                                      {s.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGroupEditModal(group)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  ✏️ Edit Triggers
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroup(group)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--red)' }}
                                  title="Delete triggers"
                                >
                                  🗑️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerGroup(group)}
                                  disabled={triggeringId === group.items[0]?.id}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                >
                                  ⚡ {triggeringId === group.items[0]?.id ? 'Triggering...' : 'Trigger Now'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}

        {/* Modal Form for Editing Triggers in One Go */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-md" style={{ maxWidth: '580px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>{editingGroup ? `Edit Triggers - ${editingGroup.vendorName}` : 'Create Schedule Triggers'}</h2>
                <p>Manage all automated notification triggers for this store location & vendor in one place.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              {locations.length === 0 || vendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                  Please ensure you have created both Locations and Vendors before configuring schedules.
                </div>
              ) : (
                <form onSubmit={handleSubmitGroup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="label" htmlFor="sched-loc">Store Location *</label>
                      <select
                        id="sched-loc"
                        value={locationId}
                        disabled={!!editingGroup}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="input"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label" htmlFor="sched-vendor">Supplier/Vendor *</label>
                      <select
                        id="sched-vendor"
                        value={vendorId}
                        disabled={!!editingGroup}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="input"
                      >
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="label" style={{ marginBottom: 0 }}>Configured Triggers ({groupTriggers.filter(t => !t.isDeleted).length})</span>
                      <button
                        type="button"
                        onClick={handleAddTriggerRow}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        + Add Another Trigger
                      </button>
                    </div>

                    {groupTriggers.map((t, idx) => {
                      if (t.isDeleted) return null;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Trigger #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTriggerRow(idx)}
                              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.875rem', padding: '2px 4px' }}
                              title="Remove trigger"
                            >
                              🗑️
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: t.scheduleType === 'WEEKLY' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', alignItems: 'end' }}>
                            <div>
                              <label className="label" htmlFor={`sched-type-${idx}`} style={{ fontSize: '0.75rem' }}>Schedule Type</label>
                              <select
                                id={`sched-type-${idx}`}
                                value={t.scheduleType}
                                onChange={(e) => handleUpdateTriggerRow(idx, { scheduleType: e.target.value as any })}
                                className="input"
                                style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
                              >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                              </select>
                            </div>

                            {t.scheduleType === 'WEEKLY' && (
                              <div>
                                <label className="label" htmlFor={`sched-day-${idx}`} style={{ fontSize: '0.75rem' }}>Day of Week</label>
                                <select
                                  id={`sched-day-${idx}`}
                                  value={t.dayOfWeek}
                                  onChange={(e) => handleUpdateTriggerRow(idx, { dayOfWeek: Number(e.target.value) })}
                                  className="input"
                                  style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
                                >
                                  {DAYS_OF_WEEK.map((day, dIdx) => (
                                    <option key={dIdx} value={dIdx}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div>
                              <label className="label" htmlFor={`sched-time-${idx}`} style={{ fontSize: '0.75rem' }}>Trigger Time</label>
                              <input
                                id={`sched-time-${idx}`}
                                type="time"
                                required
                                value={t.triggerTime}
                                onChange={(e) => handleUpdateTriggerRow(idx, { triggerTime: e.target.value })}
                                className="input mono"
                                style={{ fontSize: '0.8125rem', padding: '6px 10px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                            <input
                              id={`active-${idx}`}
                              type="checkbox"
                              checked={t.isActive}
                              onChange={(e) => handleUpdateTriggerRow(idx, { isActive: e.target.checked })}
                              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <label htmlFor={`active-${idx}`} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                              Active Trigger
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {formSubmitting ? 'Saving All...' : 'Save All Triggers'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
