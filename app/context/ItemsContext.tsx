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
  itemsReady: boolean;
  refreshAllItems: () => Promise<void>;
  ensureLoaded: () => Promise<void>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemsReady, setItemsReady] = useState(false);

  const inFlightPromise = useRef<Promise<void> | null>(null);
  const initializedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (inFlightPromise.current) return inFlightPromise.current;

    const promise = (async () => {
      try {
        const first = await api.items.list({ limit: ALL_LIMIT, page: 1 });
        const extraFetches: Promise<any>[] = [];
        for (let p = 2; p <= first.totalPages; p++) {
          extraFetches.push(api.items.list({ limit: ALL_LIMIT, page: p }));
        }

        const rest = await Promise.all(extraFetches);
        const combined: Item[] = [
          ...first.data,
          ...rest.flatMap((r) => r.data),
        ];

        setAllItems(combined);
        setItemsReady(true);
        initializedRef.current = true;
      } catch (err) {
        console.error('[ItemsContext] Failed to load items cache:', err);
      } finally {
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
    setItemsReady(false);
    await fetchAll();
  }, [fetchAll]);

  return (
    <ItemsContext.Provider value={{ allItems, itemsReady, refreshAllItems, ensureLoaded }}>
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

