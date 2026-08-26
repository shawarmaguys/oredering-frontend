'use client';

import { Vendor, SortColumn, SortDir, ViewMode } from './types';
import { ProductType } from '../../../context/ProductTypesContext';

interface ItemsToolbarProps {
  vendors: Vendor[];
  productTypes?: ProductType[];
  search: string;
  onSearchChange: (val: string) => void;
  vendorFilter: string;
  onVendorFilterChange: (val: string) => void;
  productTypeFilter?: string;
  onProductTypeFilterChange?: (val: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalItems: number;
  visibleItemsCount: number;
}

export function ItemsToolbar({
  vendors,
  productTypes = [],
  search,
  onSearchChange,
  vendorFilter,
  onVendorFilterChange,
  productTypeFilter = 'all',
  onProductTypeFilterChange,
  viewMode,
  onViewModeChange,
  totalItems,
  visibleItemsCount,
}: ItemsToolbarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="input" style={{ paddingLeft: 32 }} placeholder="Search products..." value={search} onChange={e => onSearchChange(e.target.value)} />
        </div>

        {/* Category / Product Type filter */}
        {onProductTypeFilterChange && (
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={productTypeFilter} onChange={e => onProductTypeFilterChange(e.target.value)}>
            <option value="all">All Categories</option>
            {productTypes.map(pt => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
            <option value="none">Uncategorized</option>
          </select>
        )}

        {/* Vendor filter */}
        <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={vendorFilter} onChange={e => onVendorFilterChange(e.target.value)}>
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <button type="button" onClick={() => onViewModeChange('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
          <button type="button" onClick={() => onViewModeChange('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Results meta */}
      {totalItems > 0 && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
          Showing {Math.min(visibleItemsCount, totalItems)} of {totalItems} product{totalItems !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
