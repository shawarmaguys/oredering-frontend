'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { api } from '../utils/api';

export interface Schedule {
  id: string;
  locationId: string;
  location?: { id: string; name: string };
  vendorId: string;
  vendor?: { id: string; displayName: string };
  scheduleType: 'DAILY' | 'WEEKLY';
  dayOfWeek: number;
  triggerTime: string;
  slackChannel?: string;
  isActive: boolean;
  createdAt: string;
}

interface SchedulesContextType {
  schedules: Schedule[];
  schedulesLoading: boolean;
  initialized: boolean;
  refreshSchedules: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const SchedulesContext = createContext<SchedulesContextType | undefined>(undefined);

/** Normalise API response (snake_case → camelCase) once, here. */
function normalise(s: any): Schedule {
  return {
    id: s.id,
    locationId: s.locationId || s.location_id,
    location: s.location,
    vendorId: s.vendorId || s.vendor_id,
    vendor: s.vendor,
    scheduleType: s.scheduleType || s.schedule_type,
    dayOfWeek:
      s.dayOfWeek !== undefined ? s.dayOfWeek : s.day_of_week,
    triggerTime: s.triggerTime || s.trigger_time,
    slackChannel: s.slackChannel || s.slack_channel,
    isActive:
      s.isActive !== undefined
        ? s.isActive
        : s.is_active !== undefined
          ? s.is_active
          : true,
    createdAt: s.createdAt || s.created_at,
  };
}

export function SchedulesProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (inFlightPromise.current) return inFlightPromise.current;

    setSchedulesLoading(true);
    const promise = (async () => {
      try {
        const data = await api.schedules.list();
        setSchedules(data.map(normalise));
        initializedRef.current = true;
        setIsInitialized(true);
      } catch (err) {
        console.error('[SchedulesContext] Failed to load schedules:', err);
      } finally {
        setSchedulesLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll]);

  const refreshSchedules = useCallback(async () => {
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll]);

  return (
    <SchedulesContext.Provider
      value={{
        schedules,
        schedulesLoading,
        initialized: isInitialized,
        refreshSchedules,
        ensureLoaded,
      }}
    >
      {children}
    </SchedulesContext.Provider>
  );
}

export function useSchedules() {
  const ctx = useContext(SchedulesContext);
  if (!ctx) throw new Error('useSchedules must be used within a SchedulesProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}

