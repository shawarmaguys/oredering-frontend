'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useVendors } from '../../../context/VendorsContext';
import { useLocations } from '../../../context/LocationsContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';
import { useAuth } from '../../../context/AuthContext';

import { useItemsStore } from './useItemsStore';
import { ItemsToolbar } from './ItemsToolbar';
import { ItemsTileView, ItemsTableView } from './ItemsViews';
import { CreateItemModal, EditItemModal } from './ItemFormModal';
import type { Item, ViewMode } from './types';

export default function ItemsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_MANAGER';

  const { vendors: contextVendors } = useVendors();
  const { locations } = useLocations();
  const { selectedLocationId } = useLocationFilter();
  const activeLocationObj = locations.find((l) => l.id === selectedLocationId);

  const store = useItemsStore(contextVendors);
  const {
    vendors, productTypes, items, loading, error, setError,
    visibleCount, totalItems, hasMore, loadMore,
    vendorFilter, setVendorFilter, productTypeFilter, setProductTypeFilter,
    search, handleSearchChange,
    sortCol, sortDir, toggleSort,
    refreshItems, invalidateCache,
  } = store;

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  // Enable existing items modal state
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [unassignedVendors, setUnassignedVendors] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterVendorFilter, setMasterVendorFilter] = useState('all');
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [batchEnabling, setBatchEnabling] = useState(false);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const openEnableModal = async () => {
    setShowEnableModal(true);
    setMasterLoading(true);
    setSelectedMasterIds([]);
    setMasterVendorFilter('all');
    setMasterSearch('');
    try {
      const [itemsData, unassignedVendorsData] = await Promise.all([
        api.items.listUnassigned(selectedLocationId),
        api.vendors.listUnassigned(selectedLocationId),
      ]);
      setMasterItems(itemsData);
      setUnassignedVendors(unassignedVendorsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load available products.');
    } finally {
      setMasterLoading(false);
    }
  };

  const handleEnableItemForLocation = async (item: Item, initialPar = 0) => {
    try {
      await api.items.assignToLocation(item.id, selectedLocationId, initialPar);
      setMasterItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedMasterIds((prev) => prev.filter((id) => id !== item.id));
      invalidateCache();
      refreshItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to enable product for location.');
    }
  };

  const handleToggleSelectMaster = (itemId: string) => {
    setSelectedMasterIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleEnableSelectedMaster = async () => {
    if (selectedMasterIds.length === 0) return;
    setBatchEnabling(true);
    try {
      await Promise.all(
        selectedMasterIds.map((itemId) =>
          api.items.assignToLocation(itemId, selectedLocationId, 0)
        )
      );
      setMasterItems((prev) => prev.filter((i) => !selectedMasterIds.includes(i.id)));
      setSelectedMasterIds([]);
      invalidateCache();
      refreshItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to enable selected products.');
    } finally {
      setBatchEnabling(false);
    }
  };

  const handleUpdateParLevel = async (itemId: string, newPar: number) => {
    try {
      await api.items.assignToLocation(itemId, selectedLocationId, newPar);
      invalidateCache();
      refreshItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to update PAR level.');
    }
  };

  const handleEdit = (item: Item) => setEditItem(item);

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
    invalidateCache();
    try {
      await api.items.delete(id, selectedLocationId);
      refreshItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    invalidateCache();
    refreshItems();
  };

  const handleUpdated = () => {
    setEditItem(null);
    invalidateCache();
    refreshItems();
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  const LoadingSkeleton = () => (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: i === 0 ? '40px' : '32px', width: '100%' }} />)}
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminGuard>
      <div className="page-container">
        {/* Pinned Top Bar */}
        <div className="page-header-sticky">
          {/* Navigation Breadcrumbs */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Product Catalog</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div className="page-header-text">
              <h1>Product Catalog</h1>
              <p>Manage and organize your product SKU library, store PAR levels, and vendor assignments.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link href="/dashboard/admin/product-types" className="btn btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                Manage Categories
              </Link>

              {isAdmin && selectedLocationId && selectedLocationId !== 'all' && (
                <button className="btn btn-secondary" onClick={openEnableModal}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Enable Existing Products
                </button>
              )}

              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Product
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '8px' }}>
              {error}
              <button onClick={() => setError('')} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>✕</button>
            </div>
          )}

          {/* Toolbar */}
          <ItemsToolbar
            vendors={vendors}
            productTypes={productTypes}
            search={search}
            onSearchChange={handleSearchChange}
            vendorFilter={vendorFilter}
            onVendorFilterChange={setVendorFilter}
            productTypeFilter={productTypeFilter}
            onProductTypeFilterChange={setProductTypeFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalItems={totalItems}
            visibleItemsCount={visibleCount}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="page-content-scroll">
            <LoadingSkeleton />
          </div>
        ) : items.length === 0 ? (
          <div className="page-content-scroll">
            <div className="card" style={{ padding: '48px 24px' }}>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <h3>No products active at this location</h3>
                <p>Use "Enable Existing Products" to assign items from master catalog or add a new product.</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {isAdmin && selectedLocationId && selectedLocationId !== 'all' && (
                    <button className="btn btn-secondary btn-sm" onClick={openEnableModal}>Enable Existing Products</button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Add New Product</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'tile' ? (
              <div className="page-content-scroll">
                <ItemsTileView items={items} onEdit={handleEdit} onDelete={handleDeleteClick} hasMore={hasMore} onLoadMore={loadMore} />
              </div>
            ) : (
              <ItemsTableView items={items} sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} onEdit={handleEdit} onDelete={handleDeleteClick} onUpdatePar={handleUpdateParLevel} canEdit={isAdmin} hasMore={hasMore} onLoadMore={loadMore} />
            )}
          </>
        )}

        {/* Modals */}
        {showCreate && (
          <CreateItemModal
            vendors={vendors}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}

        {editItem && (
          <EditItemModal
            item={editItem}
            vendors={vendors}
            onClose={() => setEditItem(null)}
            onUpdated={handleUpdated}
          />
        )}

        {/* Enable Existing Products Modal */}
        {showEnableModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg" style={{ maxWidth: '800px', width: '90vw' }}>
              <button
                onClick={() => setShowEnableModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Enable Existing Catalog Products</h2>
                <p>
                  Choose catalog items from the master catalog to make active for{' '}
                  <strong>{activeLocationObj?.name || 'this location'}</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input"
                  style={{ flex: 1, minWidth: '220px' }}
                  placeholder="Search products by name, SKU, or vendor..."
                  value={masterSearch}
                  onChange={(e) => setMasterSearch(e.target.value)}
                />
                <select
                  className="input"
                  style={{ width: 'auto', minWidth: '180px' }}
                  value={masterVendorFilter}
                  onChange={(e) => setMasterVendorFilter(e.target.value)}
                >
                  <option value="all">All Vendors</option>
                  {(() => {
                    const enabledVendorsList = vendors || [];
                    const enabledNames = new Set(enabledVendorsList.map((v) => v.displayName));

                    const list: { id: string; name: string; isEnabled: boolean }[] = [];
                    enabledVendorsList.forEach((v) => {
                      list.push({ id: v.id, name: v.displayName, isEnabled: true });
                    });
                    (unassignedVendors || []).forEach((v) => {
                      if (!enabledNames.has(v.displayName)) {
                        list.push({ id: v.id, name: v.displayName, isEnabled: false });
                      }
                    });

                    list.sort((a, b) => a.name.localeCompare(b.name));

                    return list.map((v) => (
                      <option key={v.id} value={v.name} disabled={!v.isEnabled}>
                        {v.name}{!v.isEnabled ? ' (Disabled)' : ''}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {masterLoading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading catalog items...
                </div>
              ) : (
                (() => {
                  const enabledVendorIds = new Set((vendors || []).map((v) => v.id));
                  const enabledVendorNames = new Set((vendors || []).map((v) => v.displayName));

                  const filtered = masterItems
                    .filter((i) => {
                      const q = masterSearch.toLowerCase();
                      const matchesSearch = (
                        i.displayName.toLowerCase().includes(q) ||
                        (i.productCode && i.productCode.toLowerCase().includes(q)) ||
                        (i.vendor && i.vendor.displayName.toLowerCase().includes(q))
                      );
                      const matchesVendor = masterVendorFilter === 'all' || i.vendor?.displayName === masterVendorFilter;
                      const isVendorEnabled = i.vendorId
                        ? enabledVendorIds.has(i.vendorId)
                        : (i.vendor as any)?.id
                        ? enabledVendorIds.has((i.vendor as any).id)
                        : i.vendor?.displayName
                        ? enabledVendorNames.has(i.vendor.displayName)
                        : false;

                      return matchesSearch && matchesVendor && isVendorEnabled;
                    })
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));

                  if (filtered.length === 0) {
                    return (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '32px 16px',
                          background: 'var(--bg-sunken, var(--bg-surface))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-default)',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                          {masterSearch || masterVendorFilter !== 'all' ? 'No matching products found' : 'All products are active'}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {masterSearch || masterVendorFilter !== 'all'
                            ? 'Try clearing filters or searching for a different product.'
                            : `All catalog products are currently active at ${activeLocationObj?.name || 'this location'}.`}
                        </div>
                      </div>
                    );
                  }

                  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedMasterIds.includes(i.id));

                  const handleSelectAllFiltered = () => {
                    if (allFilteredSelected) {
                      const filteredIds = filtered.map((i) => i.id);
                      setSelectedMasterIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                    } else {
                      const filteredIds = filtered.map((i) => i.id);
                      setSelectedMasterIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                    }
                  };

                  return (
                    <div>
                      {/* Select All Bar */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          marginBottom: '8px',
                          background: 'var(--bg-sunken, var(--bg-surface))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '13px',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={handleSelectAllFiltered}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                          Select All ({filtered.length} products)
                        </label>
                        {selectedMasterIds.length > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                            {selectedMasterIds.length} selected
                          </span>
                        )}
                      </div>

                      {/* Items List */}
                      <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {filtered.map((item) => {
                          const isSelected = selectedMasterIds.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleSelectMaster(item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                background: isSelected ? 'var(--accent-subtle, rgba(235, 94, 40, 0.08))' : 'var(--bg-sunken, var(--bg-surface))',
                                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div onClick
                                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                                    {item.displayName}
                                  </div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                                    <span>SKU: <span className="mono">{item.productCode || '—'}</span></span>
                                    <span>• Vendor: {item.vendor?.displayName || '—'}</span>
                                    <span>• Unit: {item.displayUnitName || item.baseUnitName}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selectedMasterIds.length > 0 ? `${selectedMasterIds.length} item(s) selected` : 'Click items or checkboxes to select multiple.'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedMasterIds.length > 0 && (
                    <button
                      onClick={handleEnableSelectedMaster}
                      disabled={batchEnabling}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {batchEnabling ? 'Enabling...' : `Enable Selected (${selectedMasterIds.length})`}
                    </button>
                  )}
                  <button onClick={() => setShowEnableModal(false)} className="btn btn-secondary">
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title={selectedLocationId && selectedLocationId !== 'all' ? "Remove Product from Location" : "Delete Product"}
          message={
            selectedLocationId && selectedLocationId !== 'all'
              ? `Are you sure you want to remove "${itemToDelete?.name}" from ${activeLocationObj?.name || 'this location'}? The product will remain saved in the master catalog.`
              : `Are you sure you want to delete "${itemToDelete?.name}"? This cannot be undone.`
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}
        />
      </div>
    </AdminGuard>
  );
}
