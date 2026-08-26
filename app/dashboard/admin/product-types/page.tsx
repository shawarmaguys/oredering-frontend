'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../components/AdminGuard';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useProductTypes, ProductType } from '../../../context/ProductTypesContext';

const DEFAULT_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald/Green
  '#f59e0b', // Amber/Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export default function ProductTypesPage() {
  const {
    productTypes,
    productTypesLoading: loading,
    createProductType,
    updateProductType,
    deleteProductType,
  } = useProductTypes();

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string; name: string } | null>(null);

  // Handlers
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      await createProductType({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
      });

      setName('');
      setDescription('');
      setColor(DEFAULT_COLORS[0]);
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !editName.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      await updateProductType(selectedType.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        color: editColor || undefined,
      });

      setShowEditModal(false);
      setSelectedType(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, typeName: string) => {
    setTypeToDelete({ id, name: typeName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!typeToDelete) return;
    const { id } = typeToDelete;
    setDeleteConfirmOpen(false);
    setTypeToDelete(null);
    setError('');
    try {
      await deleteProductType(id);
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  const openEditModal = (pt: ProductType) => {
    setSelectedType(pt);
    setEditName(pt.name);
    setEditDescription(pt.description || '');
    setEditColor(pt.color || DEFAULT_COLORS[0]);
    setError('');
    setShowEditModal(true);
  };

  const filteredTypes = productTypes.filter(pt => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return pt.name.toLowerCase().includes(q) || (pt.description && pt.description.toLowerCase().includes(q));
  });

  return (
    <AdminGuard>
      <div className="page-container">
        {/* Sticky Header */}
        <div className="page-header-sticky">
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <Link href="/dashboard/admin/items">Product Catalog</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Categories</span>
          </div>

          <div className="page-header">
            <div className="page-header-text">
              <h1>Product Categories</h1>
              <p>Configure product types & categories for grouping inventory items and filtering catalog listings.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError('');
                setShowCreateModal(true);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Category
            </button>
          </div>

          {error && !showCreateModal && !showEditModal && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Search categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setViewMode('tile')}
                title="Tile view"
                style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="List view"
                style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Category List */}
        {loading ? (
          <div className="page-content-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse" style={{ padding: '20px', height: '140px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="skeleton" style={{ height: '20px', width: '50%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '80%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="page-content-scroll">
            <div className="card" style={{ padding: '48px 24px' }}>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                </div>
                <h3>No categories found</h3>
                <p>{search ? 'No categories matched your search term.' : 'Create product categories (e.g. Meat, Produce, Packaging) to group products.'}</p>
                {!search && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    Create First Category
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : viewMode === 'tile' ? (
          <div className="page-content-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
              {filteredTypes.map(pt => {
                const ptColor = pt.color || '#3b82f6';
                return (
                  <div key={pt.id} className="card card-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: `${ptColor}22`,
                            color: ptColor,
                            borderColor: ptColor,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                          }}
                        >
                          {pt.name}
                        </span>
                      </div>
                      {pt.description ? (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                          {pt.description}
                        </p>
                      ) : (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
                          No description provided.
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(pt)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleDeleteClick(pt.id, pt.name)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="table-scroll-container">
            <div className="table-responsive-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Category Name</th>
                    <th>Color Badge</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTypes.map(pt => {
                    const ptColor = pt.color || '#3b82f6';
                    return (
                      <tr key={pt.id}>
                        <td style={{ paddingLeft: 24, fontWeight: 600 }}>{pt.name}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${ptColor}22`,
                              color: ptColor,
                              borderColor: ptColor,
                              fontSize: '0.75rem',
                            }}
                          >
                            {pt.name}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{pt.description || '—'}</td>
                        <td style={{ textAlign: 'right', paddingRight: 24 }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(pt)}>Edit</button>
                            <button type="button" className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleDeleteClick(pt.id, pt.name)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal-backdrop">
            <div className="modal-panel">
              <button type="button" onClick={() => setShowCreateModal(false)} className="modal-close">✕</button>
              <div className="modal-header">
                <h2>New Product Category</h2>
                <p>Add a product category to organize your SKU catalog.</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label" htmlFor="cat-name">Category Name *</label>
                  <input
                    id="cat-name"
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input"
                    placeholder="e.g. Meat & Poultry, Produce, Packaging"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="cat-desc">Description</label>
                  <input
                    id="cat-desc"
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="input"
                    placeholder="e.g. Raw meats and proteins"
                  />
                </div>

                <div>
                  <span className="label" style={{ display: 'block', marginBottom: '6px' }}>Badge Color</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {DEFAULT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer',
                          transform: color === c ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      title="Custom Color"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                    {submitting ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedType && (
          <div className="modal-backdrop">
            <div className="modal-panel">
              <button type="button" onClick={() => { setShowEditModal(false); setSelectedType(null); }} className="modal-close">✕</button>
              <div className="modal-header">
                <h2>Edit Category</h2>
                <p>Modify category details or color badge.</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label" htmlFor="edit-cat-name">Category Name *</label>
                  <input
                    id="edit-cat-name"
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="edit-cat-desc">Description</label>
                  <input
                    id="edit-cat-desc"
                    type="text"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <span className="label" style={{ display: 'block', marginBottom: '6px' }}>Badge Color</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {DEFAULT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: editColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                          cursor: 'pointer',
                          transform: editColor === c ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      title="Custom Color"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="button" onClick={() => { setShowEditModal(false); setSelectedType(null); }} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Delete Category?"
          message={`Are you sure you want to delete category "${typeToDelete?.name}"? Items currently assigned to this category will become uncategorized.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteConfirmOpen(false); setTypeToDelete(null); }}
        />
      </div>
    </AdminGuard>
  );
}
