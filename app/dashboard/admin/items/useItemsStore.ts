'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../utils/api';
import { Item, Vendor, SortColumn, SortDir } from './types';

const PAGE_SIZE = 10;
const LS_KEY = 'items_vendor_filter';
// Fetch all items at once for cache — capped at a realistic catalog ceiling
const ALL_LIMIT = 500;

function applyClientFilter(
  allItems: Item[],
  filter: string,
  search: string,
  page: number,
  sortCol: SortColumn,
  sortDir: SortDir,
) {
  let filtered = allItems;

  if (filter !== 'all') {
    filtered = filtered.filter((i) => i.vendorId === filter);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.displayName.toLowerCase().includes(q) ||
        i.productCode?.toLowerCase().includes(q),
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let valA: any = '';
    let valB: any = '';
    if (sortCol === 'name') { valA = a.displayName; valB = b.displayName; }
    else if (sortCol === 'vendor') { valA = a.vendor?.displayName ?? ''; valB = b.vendor?.displayName ?? ''; }
    else if (sortCol === 'code') { valA = a.productCode ?? ''; valB = b.productCode ?? ''; }
    else if (sortCol === 'note') { valA = a.note ?? ''; valB = b.note ?? ''; }
    else if (sortCol === 'pack') { valA = a.displayUnitName; valB = b.displayUnitName; }
    else if (sortCol === 'baseUnit') { valA = a.baseUnitName; valB = b.baseUnitName; }
    else if (sortCol === 'multiplier') { valA = Number(a.multiplier); valB = Number(b.multiplier); }
    else if (sortCol === 'status') { valA = a.isActive ? 1 : 0; valB = b.isActive ? 1 : 0; }
    if (typeof valA === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const data = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return { data, total, totalPages, page: safePage };
}

export function useItemsStore(
  contextVendors: Vendor[] = [],
  contextAllItems: Item[] = [],
  contextItemsReady = false,
) {
  const [vendors, setVendors] = useState<Vendor[]>(contextVendors);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [vendorFilter, setVendorFilterState] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // All-items cache: now seeded from ItemsContext and kept in sync
  const allItemsCache = useRef<Item[] | null>(contextItemsReady ? contextAllItems : null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ----- Sort toggle -----
  const toggleSort = useCallback((col: SortColumn) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortDir('asc');
      return col;
    });
  }, []);

  // ----- Debounced search -----
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 400);
  }, []);

  // ----- Vendor filter change -----
  const setVendorFilter = useCallback((val: string) => {
    setVendorFilterState(val);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      if (val !== 'all') localStorage.setItem(LS_KEY, val);
      else localStorage.removeItem(LS_KEY);
    }
  }, []);

  // ----- Apply state from cache or server -----
  const applyFromCache = useCallback(
    (filter: string, page: number, search: string) => {
      if (!allItemsCache.current) return false;
      const result = applyClientFilter(allItemsCache.current, filter, search, page, sortCol, sortDir);
      setItems(result.data);
      setTotalItems(result.total);
      setTotalPages(result.totalPages);
      setCurrentPage(result.page);
      return true;
    },
    [sortCol, sortDir],
  );

  const fetchFromServer = useCallback(
    async (filter: string, page: number, search: string) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.items.list({
          vendorId: filter !== 'all' ? filter : undefined,
          search: search || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setItems(res.data);
        setTotalItems(res.total);
        setTotalPages(res.totalPages);
      } catch (err: any) {
        setError(err.message || 'Failed to load items.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadItems = useCallback(
    async (filter: string, page: number, searchTerm: string) => {
      if (applyFromCache(filter, page, searchTerm)) return;
      await fetchFromServer(filter, page, searchTerm);
    },
    [applyFromCache, fetchFromServer],
  );

  // ----- Initial boot -----
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        // Use vendors from context (already loaded globally), no extra fetch needed
        const vendorsData = contextVendors.length > 0 ? contextVendors : await api.vendors.list();
        setVendors(vendorsData);

        const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
        let initialFilter: string;
        if (saved) {
          const exists = vendorsData.some((v: Vendor) => v.id === saved);
          initialFilter = exists ? saved : (vendorsData.length > 0 ? vendorsData[0].id : 'all');
        } else {
          initialFilter = vendorsData.length > 0 ? vendorsData[0].id : 'all';
        }

        setVendorFilterState(initialFilter);

        // If context cache is already ready, use it immediately (no server call)
        if (contextItemsReady && contextAllItems.length > 0) {
          allItemsCache.current = contextAllItems;
          const result = applyClientFilter(contextAllItems, initialFilter, '', 1, 'name', 'asc');
          setItems(result.data);
          setTotalItems(result.total);
          setTotalPages(result.totalPages);
          setLoading(false);
        } else {
          await fetchFromServer(initialFilter, 1, '');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial data.');
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep vendors in sync if context provides them after mount
  useEffect(() => {
    if (contextVendors.length > 0) {
      setVendors(contextVendors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextVendors.length]);

  // Sync the global items cache into the local ref whenever ItemsContext resolves
  useEffect(() => {
    if (contextItemsReady && contextAllItems.length > 0) {
      allItemsCache.current = contextAllItems;
      // Re-apply current filter / page / search against the now-populated cache
      applyFromCache(vendorFilter, currentPage, debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextItemsReady, contextAllItems.length]);

  // ----- React to filter / page / search changes -----
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    loadItems(vendorFilter, currentPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorFilter, currentPage, debouncedSearch]);

  // Re-sort whenever sort settings change (use cache if available)
  useEffect(() => {
    if (allItemsCache.current) {
      applyFromCache(vendorFilter, currentPage, debouncedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortCol, sortDir]);

  // ----- Mutations (invalidate cache on write) -----
  const invalidateCache = useCallback(() => {
    allItemsCache.current = null;
  }, []);

  const refreshItems = useCallback(() => {
    allItemsCache.current = null;
    loadItems(vendorFilter, currentPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorFilter, currentPage, debouncedSearch, loadItems]);

  return {
    // Data
    vendors,
    items,
    loading,
    error,
    setError,
    // Pagination
    currentPage,
    totalItems,
    totalPages,
    setCurrentPage,
    PAGE_SIZE,
    // Filters
    vendorFilter,
    setVendorFilter,
    search,
    handleSearchChange,
    // Sort
    sortCol,
    sortDir,
    toggleSort,
    // Actions
    refreshItems,
    invalidateCache,
  };
}
