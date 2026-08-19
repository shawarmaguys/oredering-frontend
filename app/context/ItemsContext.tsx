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
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsReady, setItemsReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const inFlightPromise = useRef<Promise<void> | null>(null);
  const initializedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (inFlightPromise.current) return inFlightPromise.current;

    setItemsLoading(true);
    const promise = (async () => {
      try {
        const first: any = await api.items.list({ limit: ALL_LIMIT, page: 1 });
        if (Array.isArray(first)) {
          setAllItems(first);
          setItemsReady(true);
          initializedRef.current = true;
          setIsInitialized(true);
          return;
        }

        const firstData: Item[] = Array.isArray(first?.data) ? first.data : [];
        const totalPages = typeof first?.totalPages === 'number' ? first.totalPages : 1;
        const extraFetches: Promise<any>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          extraFetches.push(api.items.list({ limit: ALL_LIMIT, page: p }));
        }

        const rest = await Promise.all(extraFetches);
        const combined: Item[] = [
          ...firstData,
          ...rest.flatMap((r: any) =>
            Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [],
          ),
        ];

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
  }, []);

  const ensureLoaded = useCallback(async () => {
    if (!initializedRef.current) {
      return fetchAll();
    }
  }, [fetchAll]);

  const refreshAllItems = useCallback(async () => {
    initializedRef.current = false;
    setIsInitialized(false);
    setItemsReady(false);
    await fetchAll();
  }, [fetchAll]);

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
