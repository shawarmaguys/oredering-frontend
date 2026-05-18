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
      // Append :00 to triggerTime if it's just HH:MM
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
      <div className="space-y-6 animate-fade-in-up">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Schedules</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Ordering Schedules</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Configure automated Slack notifications for stock takes.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Create Schedule
          </button>
        </div>

        {error && !showModal && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Schedules list */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-4xl mb-4 block">📅</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Active Schedules</h3>
            <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              Establish schedules to ping Slack channels and automatically coordinate worker counts.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl transition-all"
            >
              Add First Schedule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl" />
                
                {/* Status and Type Tag */}
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg ${
                    schedule.scheduleType === 'DAILY' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                  }`}>
                    {schedule.scheduleType}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Store Location</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {schedule.location?.name || 'Unknown Location'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Wholesale Vendor</p>
                    <p className="text-base font-bold text-teal-600 dark:text-teal-400">
                      {schedule.vendor?.displayName || 'Unknown Vendor'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 dark:border-zinc-800/80">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold">Trigger Time</p>
                      <p className="text-sm font-mono text-gray-900 dark:text-white font-bold">{schedule.triggerTime.substring(0, 5)}</p>
                    </div>
                    {schedule.scheduleType === 'WEEKLY' && schedule.dayOfWeek !== undefined && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">Trigger Day</p>
                        <p className="text-sm text-gray-900 dark:text-white font-bold">{DAYS_OF_WEEK[schedule.dayOfWeek]}</p>
                      </div>
                    )}
                  </div>

                  {schedule.slackChannel && (
                    <div className="pt-2 border-t border-gray-50 dark:border-zinc-800/80">
                      <p className="text-xs text-gray-400 uppercase font-semibold">Slack Target</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                        #{schedule.slackChannel}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400">
                  <span>ID: {schedule.id.substring(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Create Schedule</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Schedule routine stock takes for locations and suppliers.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {locations.length === 0 || vendors.length === 0 ? (
                <div className="text-center py-4 text-sm text-red-500">
                  Please ensure you have created both Locations and Vendors before configuring schedules.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Store Location *
                    </label>
                    <select
                      value={locationId}
                      onChange={(e) => setLocationId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Supplier/Vendor *
                    </label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Schedule Type *
                      </label>
                      <select
                        value={scheduleType}
                        onChange={(e) => setScheduleType(e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Trigger Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={triggerTime}
                        onChange={(e) => setTriggerTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                    </div>
                  </div>

                  {scheduleType === 'WEEKLY' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Day of Week *
                      </label>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Target Slack Channel
                    </label>
                    <input
                      type="text"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. orders-kitchen"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]"
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
