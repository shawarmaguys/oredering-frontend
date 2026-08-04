'use client';

import { useState } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

import { useItemsStore } from './useItemsStore';
import { ItemsToolbar } from './ItemsToolbar';
import { ItemsPagination } from './ItemsPagination';
import { ItemsTileView, ItemsTableView } from './ItemsViews';
import { CreateItemModal, EditItemModal } from './ItemFormModal';
import type { Item, ViewMode } from './types';

export default function ItemsPage() {
  const store = useItemsStore();
  const {
    vendors, items, loading, error, setError,
    currentPage, totalItems, totalPages, setCurrentPage, PAGE_SIZE,
    vendorFilter, setVendorFilter, search, handleSearchChange,
    sortCol, sortDir, toggleSort,
    refreshItems, invalidateCache,
  } = store;

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────
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
      await api.items.delete(id);
      const newPage = items.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      refreshItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    invalidateCache();
    setCurrentPage(1);
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
      <div className="page-content animate-fade-up">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title">Product Catalog</h1>
            <p className="page-subtitle">Manage and organize your full product SKU library with vendor assignments and unit conversions.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Product
          </button>
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
          search={search}
          onSearchChange={handleSearchChange}
          vendorFilter={vendorFilter}
          onVendorFilterChange={setVendorFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
        />

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <h3>No products found</h3>
              <p>Try adjusting your search or filter, or add a new product.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Add First Product</button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'tile' ? (
              <ItemsTileView items={items} onEdit={handleEdit} onDelete={handleDeleteClick} />
            ) : (
              <ItemsTableView items={items} sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} onEdit={handleEdit} onDelete={handleDeleteClick} />
            )}
            <ItemsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
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
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Delete Product"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteConfirmOpen(false); setItemToDelete(null); }}
        />
      </div>
    </AdminGuard>
  );
}
