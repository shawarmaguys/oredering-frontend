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
import { useLocationFilter } from './LocationFilterContext';
import { useAuth } from './AuthContext';

export interface Vendor {
  id: string;
  displayName: string;
  channelName?: string;
  email?: string;
  otherEmails?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  departmentId: string;
  department?: { id: string; code: string; fullName: string };
  locationVendors?: Array<{ locationId: string }>;
  createdAt: string;
}

export interface Department {
  id: string;
  code: string;
  fullName: string;
  slackChannel?: string;
}

interface VendorsContextType {
  vendors: Vendor[];
  departments: Department[];
  vendorsLoading: boolean;
  initialized: boolean;
  refreshVendors: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const VendorsContext = createContext<VendorsContextType | undefined>(undefined);

export function VendorsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  let locationFilter: ReturnType<typeof useLocationFilter> | undefined;
  try {
    locationFilter = useLocationFilter();
  } catch (_) {
    // Graceful fallback if instantiated outside LocationFilterProvider
  }

  const selectedLocationId = locationFilter?.selectedLocationId || '';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const cacheMap = useRef<Map<string, Vendor[]>>(new Map());
  const activeLocationRef = useRef<string>(selectedLocationId);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchVendorsForLocation = useCallback(async (locId: string, forceRefresh = false) => {
    if (!isAuthenticated) return;
    if (!locId || locId === 'all') return;

    if (!forceRefresh && cacheMap.current.has(locId)) {
      setVendors(cacheMap.current.get(locId)!);
      setIsInitialized(true);
      return;
    }

    if (!forceRefresh && inFlightPromise.current) return inFlightPromise.current;

    setVendorsLoading(true);
    const promise = (async () => {
      try {
        const [vendorsData, deptsData] = await Promise.all([
          api.vendors.list(locId),
          api.vendors.departments(),
        ]);

        cacheMap.current.set(locId, vendorsData);
        setVendors(vendorsData);
        setDepartments(deptsData);
        setIsInitialized(true);
      } catch (err) {
        console.error('[VendorsContext] Failed to load vendors/departments:', err);
      } finally {
        setVendorsLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedLocationId && selectedLocationId !== 'all') {
      activeLocationRef.current = selectedLocationId;
      fetchVendorsForLocation(selectedLocationId);
    }
  }, [isAuthenticated, selectedLocationId, fetchVendorsForLocation]);

  // Reset state on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setVendors([]);
      setDepartments([]);
      cacheMap.current.clear();
      setIsInitialized(false);
      inFlightPromise.current = null;
    }
  }, [isAuthenticated, authLoading]);

  const ensureLoaded = useCallback(async () => {
    if (!isAuthenticated) return;
    const locId = activeLocationRef.current || selectedLocationId;
    if (locId && locId !== 'all') {
      await fetchVendorsForLocation(locId);
    }
  }, [fetchVendorsForLocation, selectedLocationId, isAuthenticated]);

  const refreshVendors = useCallback(async () => {
    if (!isAuthenticated) return;
    cacheMap.current.clear();
    const locId = activeLocationRef.current || selectedLocationId;
    if (locId && locId !== 'all') {
      await fetchVendorsForLocation(locId, true);
    }
  }, [fetchVendorsForLocation, selectedLocationId, isAuthenticated]);

  return (
    <VendorsContext.Provider
      value={{
        vendors,
        departments,
        vendorsLoading,
        initialized: isInitialized,
        refreshVendors,
        ensureLoaded,
      }}
    >
      {children}
    </VendorsContext.Provider>
  );
}

export function useVendors() {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error('useVendors must be used within a VendorsProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}

