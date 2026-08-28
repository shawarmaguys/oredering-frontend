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
import { Item } from '../dashboard/admin/items/types';
import { useLocationFilter } from './LocationFilterContext';
import { useAuth } from './AuthContext';

const ALL_LIMIT = 500;

interface ItemsContextType {
  allItems: Item[];
  itemsLoading: boolean;
  itemsReady: boolean;
  initialized: boolean;
  refreshAllItems: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedLocationId } = useLocationFilter();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsReady, setItemsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const cacheMap = useRef<Map<string, Item[]>>(new Map());
  const inFlightPromise = useRef<Promise<void> | null>(null);
  const initializedRef = useRef(false);

  const fetchAllForLocation = useCallback(async (locId: string, forceRefresh = false) => {
    if (!isAuthenticated) return;
    if (!locId || locId === 'all') return;
    if (!forceRefresh && inFlightPromise.current) return inFlightPromise.current;

    setItemsLoading(true);
    const promise = (async () => {
      try {
        const queryParam = locId;
        const first: any = await api.items.list({ limit: ALL_LIMIT, page: 1, locationId: queryParam });
        
        let combined: Item[] = [];
        if (Array.isArray(first)) {
          combined = first;
        } else {
          const firstData: Item[] = Array.isArray(first?.data) ? first.data : [];
          const totalPages = typeof first?.totalPages === 'number' ? first.totalPages : 1;
          const extraFetches: Promise<any>[] = [];
          for (let p = 2; p <= totalPages; p++) {
            extraFetches.push(api.items.list({ limit: ALL_LIMIT, page: p, locationId: queryParam }));
          }
          const rest = await Promise.all(extraFetches);
          combined = [
            ...firstData,
            ...rest.flatMap((r: any) =>
              Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [],
            ),
          ];
        }

        cacheMap.current.set(locId, combined);
        setAllItems(combined);
        setItemsReady(true);
        initializedRef.current = true;
        setIsInitialized(true);
      } catch (err) {
        console.error('[ItemsContext] Failed to load items cache:', err);
      } finally {
        setItemsLoading(false);
        inFlightPromise.current = null;
      }
    })();

    inFlightPromise.current = promise;
    return promise;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!selectedLocationId || selectedLocationId === 'all') return;
    const locKey = selectedLocationId;
    const cached = cacheMap.current.get(locKey);
    if (cached) {
      setAllItems(cached);
      setItemsReady(true);
      setIsInitialized(true);
      // Background refresh
      fetchAllForLocation(locKey);
    } else {
      setAllItems([]);
      setItemsReady(false);
      setIsInitialized(false);
      initializedRef.current = false;
      fetchAllForLocation(locKey);
    }
  }, [isAuthenticated, selectedLocationId, fetchAllForLocation]);

  // Reset state on logout
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setAllItems([]);
      cacheMap.current.clear();
      initializedRef.current = false;
      setIsInitialized(false);
      setItemsReady(false);
      inFlightPromise.current = null;
    }
  }, [isAuthenticated, authLoading]);

  const ensureLoaded = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!selectedLocationId || selectedLocationId === 'all') return;
    const locKey = selectedLocationId;
    if (!cacheMap.current.has(locKey)) {
      return fetchAllForLocation(locKey);
    }
  }, [isAuthenticated, selectedLocationId, fetchAllForLocation]);

  const refreshAllItems = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!selectedLocationId || selectedLocationId === 'all') return;
    const locKey = selectedLocationId;
    cacheMap.current.delete(locKey);
    initializedRef.current = false;
    setIsInitialized(false);
    setItemsReady(false);
    await fetchAllForLocation(locKey, true);
  }, [isAuthenticated, selectedLocationId, fetchAllForLocation]);

  return (
    <ItemsContext.Provider
      value={{
        allItems,
        itemsLoading,
        itemsReady,
        initialized: isInitialized,
        refreshAllItems,
        ensureLoaded,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within an ItemsProvider');

  useEffect(() => {
    ctx.ensureLoaded();
  }, [ctx]);

  return ctx;
}
