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

export interface Vendor {
  id: string;
  displayName: string;
  channelName?: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  departmentId: string;
  department?: { id: string; code: string; fullName: string };
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchAll = useCallback(async () => {
    if (inFlightPromise.current) return inFlightPromise.current;

    setVendorsLoading(true);
    const promise = (async () => {
      try {
        const [vendorsData, deptsData] = await Promise.all([
          api.vendors.list(),
          api.vendors.departments(),
        ]);
        setVendors(vendorsData);
        setDepartments(deptsData);
        initializedRef.current = true;
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
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll]);

  // Exposed refresh — call after any create / update / delete mutation
  const refreshVendors = useCallback(async () => {
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll]);

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

