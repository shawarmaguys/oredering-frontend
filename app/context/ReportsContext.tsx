'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendor?: {
    id?: string;
    displayName: string;
    channelName?: string;
  };
  locationId: string;
  location?: {
    id?: string;
    name: string;
  };
  stockRecordId?: string;
  createdBy?: string;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED' | 'CANCELLED' | 'APPROVED' | string;
  pdfUrl?: string;
  notes?: string;
  emailsSent?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    id?: string;
    name: string;
  };
  submittedBy: string;
  slackMessageTs?: string;
  submittedAt: string;
  isCompleted?: boolean;
}

interface ReportsContextType {
  purchaseOrders: PurchaseOrder[];
  stockRecords: StockRecord[];
  pendingReviews: PurchaseOrder[];
  loading: boolean;
  posLoading: boolean;
  stockRecordsLoading: boolean;
  initialized: boolean;
  refreshPurchaseOrders: () => Promise<void>;
  refreshStockRecords: () => Promise<void>;
  refreshAll: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [stockRecordsLoading, setStockRecordsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializedRef = useRef(false);
  const inFlightPromise = useRef<Promise<void> | null>(null);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setPosLoading(true);
    try {
      const res = await api.purchaseOrders.list();
      const rawList = Array.isArray(res) ? res : res?.data || [];
      const mapped: PurchaseOrder[] = rawList.map((po: any) => ({
        id: po.id,
        vendorId: po.vendorId || po.vendor_id,
        vendor: po.vendor,
        locationId: po.locationId || po.location_id,
        location: po.location,
        stockRecordId: po.stockRecordId || po.stock_record_id,
        createdBy: po.createdBy || po.created_by,
        status: po.status,
        pdfUrl: po.pdfUrl || po.pdf_url,
        notes: po.notes,
        emailsSent: po.emailsSent || po.emails_sent,
        createdAt: po.createdAt || po.created_at,
        updatedAt: po.updatedAt || po.updated_at,
      }));
      setPurchaseOrders(mapped);
    } catch (err) {
      console.error('[ReportsContext] Failed to load purchase orders:', err);
    } finally {
      setPosLoading(false);
    }
  }, [isAuthenticated]);

  const fetchStockRecords = useCallback(async () => {
    if (!isAuthenticated) return;
    setStockRecordsLoading(true);
    try {
      const res = await api.stockRecords.list();
      const rawList = Array.isArray(res) ? res : res?.data || [];
      const mapped: StockRecord[] = rawList.map((sr: any) => ({
        id: sr.id,
        locationId: sr.locationId || sr.location_id,
        location: sr.location,
        submittedBy: sr.submittedBy || sr.submitted_by || 'Worker',
        slackMessageTs: sr.slackMessageTs || sr.slack_message_ts,
        submittedAt: sr.submittedAt || sr.submitted_at,
        isCompleted: sr.isCompleted ?? sr.is_completed ?? true,
      }));
      setStockRecords(mapped);
    } catch (err) {
      console.error('[ReportsContext] Failed to load stock records:', err);
    } finally {
      setStockRecordsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    if (inFlightPromise.current) return inFlightPromise.current;

    const promise = (async () => {
      await Promise.all([fetchPurchaseOrders(), fetchStockRecords()]);
      initializedRef.current = true;
      setIsInitialized(true);
      inFlightPromise.current = null;
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [fetchPurchaseOrders, fetchStockRecords]);

  const ensureLoaded = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll, isAuthenticated]);

  // Reset state on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setPurchaseOrders([]);
      setStockRecords([]);
      initializedRef.current = false;
      setIsInitialized(false);
      inFlightPromise.current = null;
    }
  }, [isAuthenticated, authLoading]);

  const refreshPurchaseOrders = useCallback(async () => {
    await fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const refreshStockRecords = useCallback(async () => {
    await fetchStockRecords();
  }, [fetchStockRecords]);

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    initializedRef.current = false;
    setIsInitialized(false);
    await fetchAll();
  }, [fetchAll, isAuthenticated]);

  const pendingReviews = useMemo(() => {
    return purchaseOrders.filter(
      (po) => po.status !== 'SENT'
    );
  }, [purchaseOrders]);

  const loading = posLoading || stockRecordsLoading;

  return (
    <ReportsContext.Provider
      value={{
        purchaseOrders,
        stockRecords,
        pendingReviews,
        loading,
        posLoading,
        stockRecordsLoading,
        initialized: isInitialized,
        refreshPurchaseOrders,
        refreshStockRecords,
        refreshAll,
        ensureLoaded,
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within a ReportsProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}

export function usePurchaseOrders() {
  return useReports();
}

export function useStockRecords() {
  return useReports();
}
