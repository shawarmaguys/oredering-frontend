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
  refreshVendors: () => Promise<void>;
}

const VendorsContext = createContext<VendorsContextType | undefined>(undefined);

export function VendorsProvider({ children }: { children: React.ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);

  const initialized = useRef(false);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setVendorsLoading(true);
    try {
      const [vendorsData, deptsData] = await Promise.all([
        api.vendors.list(),
        api.vendors.departments(),
      ]);
      setVendors(vendorsData);
      setDepartments(deptsData);
      initialized.current = true;
    } catch (err) {
      console.error('[VendorsContext] Failed to load vendors/departments:', err);
    } finally {
      setVendorsLoading(false);
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
  const refreshVendors = useCallback(async () => {
    initialized.current = false;
    await fetchAll();
  }, [fetchAll]);

  return (
    <VendorsContext.Provider value={{ vendors, departments, vendorsLoading, refreshVendors }}>
      {children}
    </VendorsContext.Provider>
  );
}

export function useVendors() {
  const ctx = useContext(VendorsContext);
  if (!ctx) throw new Error('useVendors must be used within a VendorsProvider');
  return ctx;
}
