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
  const [slackChannel, setSlackChannel] = useState('');
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      const formattedTime = triggerTime.length === 5 ? `${triggerTime}:00` : triggerTime;

      await api.schedules.create({
        location_id: locationId,
        vendor_id: vendorId,
        schedule_type: scheduleType,
        day_of_week: scheduleType === 'WEEKLY' ? Number(dayOfWeek) : undefined,
        trigger_time: formattedTime,
        slack_channel: slackChannel || undefined,
        is_active: true,
      });

      // Reset
      setScheduleType('DAILY');
      setDayOfWeek(1);
      setTriggerTime('09:00');
      setSlackChannel('');
      
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
        ) : schedules.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3>No active schedules</h3>
              <p>Establish automated schedules to trigger kitchen stock counts and push Slack reminders.</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Add First Schedule
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '24px'
          }} className="stagger">
            {schedules.map((schedule) => (
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
                  fontSize: '0.6875rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '4px'
                }}>
                  <span className="mono">ID: {schedule.id.substring(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
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

                  <div>
                    <label className="label" htmlFor="sched-slack">Target Slack Channel</label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix">#</span>
                      <input
                        id="sched-slack"
                        type="text"
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                        className="input"
                        placeholder="orders-kitchen"
                      />
                    </div>
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
