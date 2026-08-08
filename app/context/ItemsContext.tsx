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

// Fetch ceiling — matches the existing store constant
const ALL_LIMIT = 500;

interface ItemsContextType {
  allItems: Item[];
  itemsReady: boolean;        // True once the full background fetch completes
  refreshAllItems: () => void; // Call after any create / update / delete
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export function ItemsProvider({ children }: { children: React.ReactNode }) {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [itemsReady, setItemsReady] = useState(false);

  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setItemsReady(false);
    try {
      // First page gives us totalPages
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
      fetchingRef.current = false;
    }
  }, []);

  // Fetch once on mount in the background — no loading spinner needed
  useEffect(() => {
    if (!initializedRef.current) {
      fetchAll();
    }
  }, [fetchAll]);

  // After a mutation, re-fetch the whole cache
  const refreshAllItems = useCallback(() => {
    initializedRef.current = false;
    fetchAll();
  }, [fetchAll]);

  return (
    <ItemsContext.Provider value={{ allItems, itemsReady, refreshAllItems }}>
      {children}
    </ItemsContext.Provider>
  );
}

export function useItems() {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within an ItemsProvider');
  return ctx;
}
