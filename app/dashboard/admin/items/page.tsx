'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useVendors } from '../../../context/VendorsContext';
import { useLocations } from '../../../context/LocationsContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';
import { LocationBadge } from '../../components/LocationBadge';
import { useAuth } from '../../../context/AuthContext';

import { useItemsStore } from './useItemsStore';
import { ItemsToolbar } from './ItemsToolbar';
import { ItemsTileView, ItemsTableView } from './ItemsViews';
import { CreateItemModal, EditItemModal } from './ItemFormModal';
import { EnableProductsModal } from './EnableProductsModal';
import type { Item, ViewMode, PendingItemEdit } from './types';

export default function ItemsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_MANAGER';

  const { vendors: contextVendors } = useVendors();
  const { locations } = useLocations();
  const { selectedLocationId, selectedLocation } = useLocationFilter();
  const activeLocationObj = locations.find((l) => l.id === selectedLocationId);

  const store = useItemsStore(contextVendors);
  const {
    vendors, productTypes, items, loading, error, setError,
    visibleCount, totalItems, hasMore, loadMore,
    vendorFilter, setVendorFilter, productTypeFilter, setProductTypeFilter,
    statusFilter, setStatusFilter,
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

  // Pending spreadsheet edits state
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingItemEdit>>({});
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const hasPendingEdits = Object.keys(pendingEdits).length > 0;
  const pendingItemsCount = Object.keys(pendingEdits).length;
  const totalFieldsCount = Object.values(pendingEdits).reduce(
    (sum, edits) => sum + Object.keys(edits).length,
    0
  );

  // Warning on browser unload/close when there are unsaved edits
  useEffect(() => {
    if (!hasPendingEdits) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Cancel the event as stated by standard guidelines
      event.preventDefault();
      // Chrome requires returnValue to be set
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingEdits]);

  // Clear pending edits on location change
  const prevLocRef = useRef(selectedLocationId);
  useEffect(() => {
    if (prevLocRef.current !== selectedLocationId) {
      setPendingEdits({});
      prevLocRef.current = selectedLocationId;
    }
  }, [selectedLocationId]);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; isLastLocation: boolean } | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleFieldChange = (
    itemId: string,
    field: keyof PendingItemEdit,
    originalVal: any,
    newVal: any
  ) => {
    setPendingEdits((prev) => {
      const itemEdits = { ...(prev[itemId] || {}) };

      let isSame = false;
      if (field === 'parLevel' || field === 'multiplier') {
        isSame = Number(newVal) === Number(originalVal) || (Number.isNaN(newVal) && Number.isNaN(originalVal));
      } else if (field === 'productTypeId') {
        const orig = originalVal || null;
        const cur = newVal || null;
        isSame = orig === cur;
      } else if (field === 'isActive') {
        isSame = Boolean(originalVal) === Boolean(newVal);
      } else {
        isSame = (originalVal ?? '') === (newVal ?? '');
      }

      if (isSame) {
        delete itemEdits[field];
      } else {
        (itemEdits as any)[field] = newVal;
      }

      if (Object.keys(itemEdits).length === 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }

      return { ...prev, [itemId]: itemEdits };
    });
  };

  const handleSaveEdits = async () => {
    if (!hasPendingEdits) return;
    setIsSavingEdits(true);
    setError('');
    try {
      const entries = Object.entries(pendingEdits);
      await Promise.all(
        entries.map(async ([itemId, edits]) => {
          const originalItem = items.find((i) => i.id === itemId);
          if (!originalItem) return;

          const metaFields: (keyof PendingItemEdit)[] = [
            'productTypeId',
            'productCode',
            'note',
            'displayUnitName',
            'baseUnitName',
            'multiplier',
            'isActive',
          ];
          const hasMetaChange = metaFields.some((f) => edits[f] !== undefined);

          if (hasMetaChange) {
            await api.items.update(itemId, {
              displayName: originalItem.displayName,
              productTypeId: edits.productTypeId !== undefined ? edits.productTypeId : (originalItem.productTypeId || null),
              productCode: edits.productCode !== undefined ? edits.productCode : (originalItem.productCode || undefined),
              note: edits.note !== undefined ? edits.note : (originalItem.note || undefined),
              displayUnitName: edits.displayUnitName !== undefined ? edits.displayUnitName : (originalItem.displayUnitName || ''),
              baseUnitName: edits.baseUnitName !== undefined ? edits.baseUnitName : originalItem.baseUnitName,
              multiplier: edits.multiplier !== undefined ? edits.multiplier : (Number(originalItem.multiplier) || 1),
              isActive: edits.isActive !== undefined ? edits.isActive : originalItem.isActive,
            });
          }

          if (edits.parLevel !== undefined && selectedLocationId && selectedLocationId !== 'all') {
            await api.items.assignToLocation(itemId, selectedLocationId, edits.parLevel);
          }
        })
      );
      setPendingEdits({});
      invalidateCache();
      refreshItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product edits.');
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleDiscardEdits = () => {
    setDiscardConfirmOpen(true);
  };

  const handleConfirmDiscard = () => {
    setPendingEdits({});
    setDiscardConfirmOpen(false);
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

  const handleDeleteClick = (id: string, name: string, activeLocationCount?: number) => {
    const isLast = activeLocationCount !== undefined ? activeLocationCount <= 1 : true;
    setItemToDelete({ id, name, isLastLocation: isLast });
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
              <h1>Product Catalog <LocationBadge /></h1>
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

              {isAdmin && (
                <Link href="/dashboard/admin/items/bulk-upload" className="btn btn-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Bulk CSV Import
                </Link>
              )}

              {isAdmin && selectedLocationId && selectedLocationId !== 'all' && (
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnableModal(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Enable Existing Products
                </button>
              )}

              <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
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
              <button type="button" onClick={() => setError('')} style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>✕</button>
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
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
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
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowEnableModal(true)}>Enable Existing Products</button>
                  )}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Add New Product</button>
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
              <ItemsTableView
                items={items}
                productTypes={productTypes}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={toggleSort}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onUpdatePar={handleUpdateParLevel}
                pendingEdits={pendingEdits}
                onFieldChange={handleFieldChange}
                canEdit={isAdmin}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            )}
          </>
        )}

        {/* Floating Unsaved Edits Banner */}
        {hasPendingEdits && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              backgroundColor: 'var(--bg-surface-elevated, #1e293b)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: '1px solid var(--border-default, #334155)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent, #0d9488)' }} />
              You have {totalFieldsCount} unsaved change{totalFieldsCount !== 1 ? 's' : ''} across {pendingItemsCount} product{pendingItemsCount !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={isSavingEdits}
                className="btn btn-primary"
                style={{ padding: '6px 16px', fontSize: '0.875rem' }}
              >
                {isSavingEdits ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleDiscardEdits}
                disabled={isSavingEdits}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.875rem', color: '#94a3b8' }}
              >
                Discard
              </button>
            </div>
          </div>
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
          <EnableProductsModal
            isOpen={showEnableModal}
            onClose={() => setShowEnableModal(false)}
            locationId={selectedLocationId}
            locationName={activeLocationObj?.name || 'this location'}
            vendors={vendors}
            onEnabled={() => {
              invalidateCache();
              refreshItems();
            }}
            onError={(msg) => setError(msg)}
          />
        )}

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Remove Product from Location"
          message={`Are you sure you want to remove "${itemToDelete?.name}" from ${activeLocationObj?.name || 'this location'}?`}
          warningMessage={
            itemToDelete?.isLastLocation
              ? `This product is ONLY assigned to ${activeLocationObj?.name || 'this location'}. Removing it will deactivate it globally and remove it from the system catalog.`
              : undefined
          }
          confirmText={itemToDelete?.isLastLocation ? "Deactivate & Remove Product" : "Remove Product"}
          confirmVariant={itemToDelete?.isLastLocation ? "danger" : "primary"}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}
        />

        <ConfirmDialog
          isOpen={discardConfirmOpen}
          title="Discard Unsaved Edits?"
          message="Are you sure you want to discard all unsaved edits? Any changes you made will be lost."
          onConfirm={handleConfirmDiscard}
          onCancel={() => setDiscardConfirmOpen(false)}
        />
      </div>
    </AdminGuard>
  );
}
