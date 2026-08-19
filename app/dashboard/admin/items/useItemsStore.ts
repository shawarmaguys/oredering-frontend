'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../utils/api';
import { Item, Vendor, SortColumn, SortDir } from './types';

const PAGE_SIZE = 10;
const LS_KEY = 'items_vendor_filter';

export function useItemsStore(contextVendors: Vendor[] = []) {
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

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCounterRef = useRef(0);
  const isMountedRef = useRef(false);

  // Sync vendors from context when available
  useEffect(() => {
    if (contextVendors.length > 0) {
      setVendors(contextVendors);
    }
  }, [contextVendors]);

  // Sort toggle
  const toggleSort = useCallback((col: SortColumn) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortDir('asc');
      return col;
    });
    setCurrentPage(1);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 300);
  }, []);

  // Vendor filter change
  const setVendorFilter = useCallback((val: string) => {
    setVendorFilterState(val);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      if (val !== 'all') localStorage.setItem(LS_KEY, val);
      else localStorage.removeItem(LS_KEY);
    }
  }, []);

  // Fetch items from server
  const fetchItems = useCallback(
    async (filter: string, page: number, query: string, col: SortColumn, dir: SortDir) => {
      const fetchId = ++fetchCounterRef.current;
      setLoading(true);
      setError('');

      try {
        const res = await api.items.list({
          vendorId: filter !== 'all' ? filter : undefined,
          search: query.trim() || undefined,
          page,
          limit: PAGE_SIZE,
          sortBy: col,
          sortOrder: dir,
        });

        // Ensure we only update state for the latest request
        if (fetchId === fetchCounterRef.current) {
          setItems(res.data || []);
          setTotalItems(res.total || 0);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err: any) {
        if (fetchId === fetchCounterRef.current) {
          setError(err.message || 'Failed to load items.');
        }
      } finally {
        if (fetchId === fetchCounterRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setError('');

      try {
        let vendorsList = contextVendors;
        if (!vendorsList || vendorsList.length === 0) {
          vendorsList = await api.vendors.list();
          if (active) setVendors(vendorsList);
        }

        const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
        let initialFilter = 'all';
        if (saved) {
          const exists = vendorsList.some((v: Vendor) => v.id === saved);
          if (exists) initialFilter = saved;
        } else if (vendorsList.length > 0) {
          initialFilter = vendorsList[0].id;
        }

        if (active) {
          setVendorFilterState(initialFilter);
          isMountedRef.current = true;
          await fetchItems(initialFilter, 1, '', 'name', 'asc');
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load initial data.');
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [fetchItems, contextVendors]);

  // Query triggers when dependencies change
  useEffect(() => {
    if (!isMountedRef.current) return;
    fetchItems(vendorFilter, currentPage, debouncedSearch, sortCol, sortDir);
  }, [fetchItems, vendorFilter, currentPage, debouncedSearch, sortCol, sortDir]);

  const refreshItems = useCallback(() => {
    fetchItems(vendorFilter, currentPage, debouncedSearch, sortCol, sortDir);
  }, [fetchItems, vendorFilter, currentPage, debouncedSearch, sortCol, sortDir]);

  const invalidateCache = useCallback(() => {
    // No-op for direct server-side data, provided for interface compatibility
  }, []);

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

