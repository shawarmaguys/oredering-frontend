'use client';

import { useState, useMemo, useCallback } from 'react';
import { useItems } from '../../../context/ItemsContext';
import { useVendors, Vendor } from '../../../context/VendorsContext';
import { Item, SortColumn, SortDir } from './types';

const PAGE_SIZE = 10;
const LS_KEY = 'items_vendor_filter';

export function useItemsStore(_initialContextVendors?: Vendor[]) {
  const { vendors } = useVendors();
  const { allItems, itemsLoading, refreshAllItems } = useItems();

  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [vendorFilter, setVendorFilterState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LS_KEY) || 'all';
    }
    return 'all';
  });

  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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

  // Search
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setCurrentPage(1);
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

  // Filtered & Sorted items computed in-memory from context
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allItems];

    // 1. Vendor Filter
    if (vendorFilter !== 'all') {
      result = result.filter((item) => item.vendorId === vendorFilter);
    }

    // 2. Search Filter (searches displayName, spanishName, productCode, notes, vendor name)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const name = (item.displayName || '').toLowerCase();
        const spanish = (item.spanishName || '').toLowerCase();
        const code = (item.productCode || '').toLowerCase();
        const note = (item.note || '').toLowerCase();
        const vendorName = (item.vendor?.displayName || '').toLowerCase();
        return (
          name.includes(q) ||
          spanish.includes(q) ||
          code.includes(q) ||
          note.includes(q) ||
          vendorName.includes(q)
        );
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortCol) {
        case 'name':
          valA = a.displayName || '';
          valB = b.displayName || '';
          break;
        case 'vendor':
          valA = a.vendor?.displayName || '';
          valB = b.vendor?.displayName || '';
          break;
        case 'code':
          valA = a.productCode || '';
          valB = b.productCode || '';
          break;
        case 'note':
          valA = a.note || '';
          valB = b.note || '';
          break;
        case 'pack':
          valA = a.displayUnitName || '';
          valB = b.displayUnitName || '';
          break;
        case 'baseUnit':
          valA = a.baseUnitName || '';
          valB = b.baseUnitName || '';
          break;
        case 'multiplier':
          valA = Number(a.multiplier) || 1;
          valB = Number(b.multiplier) || 1;
          break;
        case 'status':
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
          break;
        default:
          valA = a.displayName || '';
          valB = b.displayName || '';
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allItems, vendorFilter, search, sortCol, sortDir]);

  const totalItems = filteredAndSortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Paged items for the active page
  const items = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedItems.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedItems, currentPage]);

  const refreshItems = useCallback(() => {
    refreshAllItems();
  }, [refreshAllItems]);

  const invalidateCache = useCallback(() => {
    refreshAllItems();
  }, [refreshAllItems]);

  return {
    // Data
    vendors,
    items,
    loading: itemsLoading && allItems.length === 0,
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
