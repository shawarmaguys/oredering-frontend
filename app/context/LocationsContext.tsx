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

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  slackBotToken?: string;
  slackUserToken?: string;
  createdAt: string;
}

interface LocationsContextType {
  locations: StoreLocation[];
  locationsLoading: boolean;
  refreshLocations: () => Promise<void>;
}

const LocationsContext = createContext<LocationsContextType | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const initialized = useRef(false);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLocationsLoading(true);
    try {
      const data = await api.locations.list();
      setLocations(data);
      initialized.current = true;
    } catch (err) {
      console.error('[LocationsContext] Failed to load locations:', err);
    } finally {
      setLocationsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Fetch once on mount
  useEffect(() => {
    if (!initialized.current) {
      fetchAll();
    }
  }, [fetchAll]);

  // Exposed refresh — call after any create / update / delete mutation
  const refreshLocations = useCallback(async () => {
    initialized.current = false;
    await fetchAll();
  }, [fetchAll]);

  return (
    <LocationsContext.Provider value={{ locations, locationsLoading, refreshLocations }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error('useLocations must be used within a LocationsProvider');
  return ctx;
}
