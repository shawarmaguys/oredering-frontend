'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface Location {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  displayName: string;
}

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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [locationId, setLocationId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [triggerTime, setTriggerTime] = useState('09:00');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [locationFilter, setLocationFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'time' | 'location' | 'vendor'>('location');

  // Triggering State
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleTriggerSchedule = async (id: string) => {
    setTriggeringId(id);
    setError('');
    setSuccessMessage('');
    try {
      await api.schedules.trigger(id);
      setSuccessMessage('Schedule manually triggered! Stock audit generated & Slack notification sent successfully.');
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger schedule.');
    } finally {
      setTriggeringId(null);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [schedulesData, locationsData, vendorsData] = await Promise.all([
        api.schedules.list(),
        api.locations.list(),
        api.vendors.list(),
      ]);

      const mappedSchedules = schedulesData.map((s: any) => ({
        id: s.id,
        locationId: s.locationId || s.location_id,
        location: s.location,
        vendorId: s.vendorId || s.vendor_id,
        vendor: s.vendor,
        scheduleType: s.scheduleType || s.schedule_type,
        dayOfWeek: s.dayOfWeek !== undefined ? s.dayOfWeek : s.day_of_week,
        triggerTime: s.triggerTime || s.trigger_time,
        slackChannel: s.slackChannel || s.slack_channel,
        isActive: s.isActive !== undefined ? s.isActive : s.is_active !== undefined ? s.is_active : true,
        createdAt: s.createdAt || s.created_at,
      }));

      setSchedules(mappedSchedules);
      setLocations(locationsData);
      setVendors(vendorsData);

      if (locationsData.length > 0) setLocationId(locationsData[0].id);
      if (vendorsData.length > 0) setVendorId(vendorsData[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !vendorId) {
      setError('Please ensure locations and vendors exist.');
      return;
    }
    setFormSubmitting(true);
    setError('');

    try {
      await api.schedules.create({
        locationId,
        vendorId,
        scheduleType,
        dayOfWeek: scheduleType === 'WEEKLY' ? Number(dayOfWeek) : undefined,
        triggerTime,
      });

      // Reset
      setScheduleType('DAILY');
      setDayOfWeek(1);
      setTriggerTime('09:00');

      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Schedules</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Ordering Schedules</h1>
            <p>Configure automated Slack notification schedules for routine storefront stock audits.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Create Schedule
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <select className="input" style={{ flex: '1 1 200px', minWidth: '180px' }} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="all">All Locations</option>
            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
          </select>
          <select className="input" style={{ flex: '1 1 200px', minWidth: '180px' }} value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
            <option value="all">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
          </select>
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="location">Sort: Location</option>
            <option value="vendor">Sort: Vendor</option>
            <option value="time">Sort: Time</option>
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Schedules list */}
        {loading ? (
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
        ) : (
          (() => {
            const filtered = schedules
              .filter(s => {
                if (locationFilter !== 'all' && s.locationId !== locationFilter) return false;
                if (vendorFilter !== 'all' && s.vendorId !== vendorFilter) return false;
                return true;
              })
              .sort((a, b) => {
                if (sortBy === 'location') return (a.location?.name || '').localeCompare(b.location?.name || '');
                if (sortBy === 'vendor') return (a.vendor?.displayName || '').localeCompare(b.vendor?.displayName || '');
                return a.triggerTime.localeCompare(b.triggerTime);
              });

            if (filtered.length === 0) return (
              <div className="card" style={{ padding: '48px 24px' }}>
                <div className="empty-state"><h3>No results found</h3><p>Try adjusting your search or filter.</p></div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '24px'
              }} className="stagger">
                {filtered.map((schedule) => (
                  <div
                    key={schedule.id}
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${schedule.scheduleType === 'DAILY' ? 'badge-amber' : 'badge-teal'}`}>
                        {schedule.scheduleType}
                      </span>
                      <span className="badge badge-green">
                        <span className="badge-dot" />
                        Active
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STORE LOCATION</span>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {schedule.location?.name || 'Unknown Location'}
                        </h3>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WHOLESALE VENDOR</span>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--accent)', marginTop: '2px' }}>
                          {schedule.vendor?.displayName || 'Unknown Vendor'}
                        </h3>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Trigger Time</span>
                          <p className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                            {schedule.triggerTime.substring(0, 5)}
                          </p>
                        </div>
                        {schedule.scheduleType === 'WEEKLY' && schedule.dayOfWeek !== undefined && (
                          <div>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Trigger Day</span>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                              {DAYS_OF_WEEK[schedule.dayOfWeek]}
                            </p>
                          </div>
                        )}
                      </div>

                      {schedule.slackChannel && (
                        <div style={{
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Slack:</span>
                          <span className="mono" style={{
                            color: 'var(--accent)',
                            backgroundColor: 'var(--accent-subtle)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--accent-border)',
                            fontSize: '0.75rem'
                          }}>
                            #{schedule.slackChannel}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '8px'
                    }}>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                        ID: {schedule.id.substring(0, 8)}
                      </span>

                      <button
                        onClick={() => handleTriggerSchedule(schedule.id)}
                        disabled={triggeringId === schedule.id}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'var(--accent-subtle)',
                          border: '1px solid var(--accent-border)',
                          color: 'var(--accent)',
                          cursor: 'pointer'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                        {triggeringId === schedule.id ? 'Triggering...' : 'Trigger Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '24px' }}>Store Location</th>
                        <th>Wholesale Vendor</th>
                        <th>Schedule Type</th>
                        <th>Trigger Time</th>
                        <th>Slack Channel</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((schedule) => (
                        <tr key={schedule.id}>
                          <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {schedule.location?.name || 'Unknown Location'}
                          </td>
                          <td style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            {schedule.vendor?.displayName || 'Unknown Vendor'}
                          </td>
                          <td>
                            <span className={`badge ${schedule.scheduleType === 'DAILY' ? 'badge-amber' : 'badge-teal'}`}>
                              {schedule.scheduleType}
                            </span>
                          </td>
                          <td className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {schedule.triggerTime.substring(0, 5)}
                            {schedule.scheduleType === 'WEEKLY' && schedule.dayOfWeek !== undefined && (
                              <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                ({DAYS_OF_WEEK[schedule.dayOfWeek]})
                              </span>
                            )}
                          </td>
                          <td className="mono" style={{ fontSize: '0.8125rem' }}>
                            {schedule.slackChannel ? `#${schedule.slackChannel}` : '-'}
                          </td>
                          <td>
                            <span className={`badge ${schedule.isActive ? 'badge-green' : 'badge-neutral'}`}>
                              <span className="badge-dot" style={{ backgroundColor: schedule.isActive ? 'var(--green)' : 'var(--text-tertiary)' }} />
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                            <button
                              onClick={() => handleTriggerSchedule(schedule.id)}
                              disabled={triggeringId === schedule.id}
                              className="btn btn-secondary btn-sm"
                            >
                              {triggeringId === schedule.id ? 'Triggering...' : 'Trigger Now'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-sm">
              <button
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Create Schedule</h2>
                <p>Configure automated pings to coordinate storefront employee inventory tasks.</p>
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
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="sched-loc">Store Location *</label>
                    <select
                      id="sched-loc"
                      value={locationId}
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="label" htmlFor="sched-type">Schedule Type *</label>
                      <select
                        id="sched-type"
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as any)}
                        className="input"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </div>

                    <div>
                      <label className="label" htmlFor="sched-time">Trigger Time *</label>
                      <input
                        id="sched-time"
                        type="time"
                        required
                        value={triggerTime}
                        onChange={(e) => setTriggerTime(e.target.value)}
                        className="input mono"
                      />
                    </div>
                  </div>

                  {scheduleType === 'WEEKLY' && (
                    <div>
                      <label className="label" htmlFor="sched-day">Day of Week *</label>
                      <select
                        id="sched-day"
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(Number(e.target.value))}
                        className="input"
                      >
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <option key={idx} value={idx}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}



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
                      {formSubmitting ? 'Scheduling...' : 'Set Schedule'}
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
