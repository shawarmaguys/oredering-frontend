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
import { useAuth } from './AuthContext';

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  slackBotToken?: string;
  slackUserToken?: string;
  color?: string;
  createdAt: string;
}

interface LocationsContextType {
  locations: StoreLocation[];
  locationsLoading: boolean;
  initialized: boolean;
  refreshLocations: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const LocationsContext = createContext<LocationsContextType | undefined>(undefined);

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    if (inFlightPromise.current) return inFlightPromise.current;

    setLocationsLoading(true);
    const promise = (async () => {
      try {
        const data = await api.locations.list();
        setLocations(data);
      } catch (err) {
        console.error('[LocationsContext] Failed to load locations:', err);
      } finally {
        initializedRef.current = true;
        setIsInitialized(true);
        setLocationsLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [isAuthenticated]);

  // Reset state on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocations([]);
      initializedRef.current = false;
      setIsInitialized(false);
      inFlightPromise.current = null;
    }
  }, [isAuthenticated, authLoading]);

  const ensureLoaded = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll, isAuthenticated]);

  // Exposed refresh — call after any create / update / delete mutation
  const refreshLocations = useCallback(async () => {
    if (!isAuthenticated) return;
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll, isAuthenticated]);

  return (
    <LocationsContext.Provider
      value={{
        locations,
        locationsLoading,
        initialized: isInitialized,
        refreshLocations,
        ensureLoaded,
      }}
    >
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocations() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error('useLocations must be used within a LocationsProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}

