'use client';

import { useState, useMemo, useCallback } from 'react';
import { useItems } from '../../../context/ItemsContext';
import { useVendors, Vendor } from '../../../context/VendorsContext';
import { useProductTypes } from '../../../context/ProductTypesContext';
import { Item, SortColumn, SortDir } from './types';

const BATCH_SIZE = 25;
const LS_VENDOR_KEY = 'items_vendor_filter';
const LS_CATEGORY_KEY = 'items_category_filter';

export function useItemsStore(_initialContextVendors?: Vendor[]) {
  const { vendors } = useVendors();
  const { productTypes } = useProductTypes();
  const { allItems, itemsLoading, refreshAllItems } = useItems();

  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const [vendorFilter, setVendorFilterState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LS_VENDOR_KEY) || 'all';
    }
    return 'all';
  });

  const [productTypeFilter, setProductTypeFilterState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LS_CATEGORY_KEY) || 'all';
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
    setVisibleCount(BATCH_SIZE);
  }, []);

  // Search
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(BATCH_SIZE);
  }, []);

  // Vendor filter change
  const setVendorFilter = useCallback((val: string) => {
    setVendorFilterState(val);
    setVisibleCount(BATCH_SIZE);
    if (typeof window !== 'undefined') {
      if (val !== 'all') localStorage.setItem(LS_VENDOR_KEY, val);
      else localStorage.removeItem(LS_VENDOR_KEY);
    }
  }, []);

  // Product Type filter change
  const setProductTypeFilter = useCallback((val: string) => {
    setProductTypeFilterState(val);
    setVisibleCount(BATCH_SIZE);
    if (typeof window !== 'undefined') {
      if (val !== 'all') localStorage.setItem(LS_CATEGORY_KEY, val);
      else localStorage.removeItem(LS_CATEGORY_KEY);
    }
  }, []);

  // Filtered & Sorted items computed in-memory from context
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allItems];

    // 1. Vendor Filter
    if (vendorFilter !== 'all') {
      result = result.filter((item) => item.vendorId === vendorFilter);
    }

    // 2. Product Type Filter
    if (productTypeFilter !== 'all') {
      if (productTypeFilter === 'none') {
        result = result.filter((item) => !item.productTypeId);
      } else {
        result = result.filter((item) => item.productTypeId === productTypeFilter);
      }
    }

    // 3. Search Filter (searches displayName, spanishName, productCode, notes, vendor name, category name)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const name = (item.displayName || '').toLowerCase();
        const spanish = (item.spanishName || '').toLowerCase();
        const code = (item.productCode || '').toLowerCase();
        const note = (item.note || '').toLowerCase();
        const vendorName = (item.vendor?.displayName || '').toLowerCase();
        const categoryName = (item.productType?.name || '').toLowerCase();
        return (
          name.includes(q) ||
          spanish.includes(q) ||
          code.includes(q) ||
          note.includes(q) ||
          vendorName.includes(q) ||
          categoryName.includes(q)
        );
      });
    }

    // 4. Sorting
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
        case 'category':
          valA = a.productType?.name || '';
          valB = b.productType?.name || '';
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
        case 'parLevel':
          valA = Number(a.parLevel) || 0;
          valB = Number(b.parLevel) || 0;
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
  }, [allItems, vendorFilter, productTypeFilter, search, sortCol, sortDir]);

  const totalItems = filteredAndSortedItems.length;
  const hasMore = visibleCount < totalItems;

  // Visible items slice for infinite scrolling
  const items = useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredAndSortedItems.length));
  }, [filteredAndSortedItems.length]);

  const refreshItems = useCallback(() => {
    refreshAllItems();
  }, [refreshAllItems]);

  const invalidateCache = useCallback(() => {
    refreshAllItems();
  }, [refreshAllItems]);

  return {
    // Data
    vendors,
    productTypes,
    items,
    loading: itemsLoading && allItems.length === 0,
    error,
    setError,
    // Infinite Scroll
    visibleCount,
    totalItems,
    hasMore,
    loadMore,
    BATCH_SIZE,
    // Filters
    vendorFilter,
    setVendorFilter,
    productTypeFilter,
    setProductTypeFilter,
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
