'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface Vendor {
  id: string;
  displayName: string;
}

interface Item {
  id: string;
  displayName: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  productCode?: string;
  isActive: boolean;
  vendorId: string;
  vendor?: {
    displayName: string;
  };
  createdAt: string;
  note?: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Form State
  const [displayName, setDisplayName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [baseUnitName, setBaseUnitName] = useState('');
  const [displayUnitName, setDisplayUnitName] = useState('');
  const [multiplier, setMultiplier] = useState<number | ''>('');
  const [productCode, setProductCode] = useState('');
  const [note, setNote] = useState('');

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Form State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editVendorId, setEditVendorId] = useState('');
  const [editBaseUnitName, setEditBaseUnitName] = useState('');
  const [editDisplayUnitName, setEditDisplayUnitName] = useState('');
  const [editMultiplier, setEditMultiplier] = useState<number | ''>('');
  const [editProductCode, setEditProductCode] = useState('');
  const [editNote, setEditNote] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('tile');
    }
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsData, vendorsData] = await Promise.all([
        api.items.list(),
        api.vendors.list(),
      ]);
      setItems(itemsData);
      setVendors(vendorsData);
      if (vendorsData.length > 0) {
        setVendorId(vendorsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load initial data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor first.');
      return;
    }

    const hasSecondaryUnit = displayUnitName && displayUnitName.trim() !== '';
    if (hasSecondaryUnit) {
      if (multiplier === '' || Number(multiplier) <= 0) {
        setError('Please enter a valid multiplier for the pack size.');
        return;
      }
    }

    setFormSubmitting(true);
    setError('');

    try {
      await api.items.create({
        displayName,
        vendorId,
        baseUnitName,
        displayUnitName: hasSecondaryUnit ? displayUnitName : undefined,
        multiplier: hasSecondaryUnit ? Number(multiplier) : 1,
        productCode: productCode || undefined,
        note: note || undefined,
      });

      // Reset
      setDisplayName('');
      setBaseUnitName('');
      setDisplayUnitName('');
      setMultiplier('');
      setProductCode('');
      setNote('');
      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product item.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!editVendorId) {
      setError('Please select a vendor first.');
      return;
    }

    const hasSecondaryUnit = editDisplayUnitName && editDisplayUnitName.trim() !== '';
    if (hasSecondaryUnit) {
      if (editMultiplier === '' || Number(editMultiplier) <= 0) {
        setError('Please enter a valid multiplier for the pack size.');
        return;
      }
    }

    setFormSubmitting(true);
    setError('');

    try {
      await api.items.update(selectedItem.id, {
        displayName: editDisplayName,
        vendorId: editVendorId,
        baseUnitName: editBaseUnitName,
        displayUnitName: editDisplayUnitName || '',
        multiplier: hasSecondaryUnit ? Number(editMultiplier) : 1,
        productCode: editProductCode || undefined,
        note: editNote || undefined,
      });

      setShowEditModal(false);
      setSelectedItem(null);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update product item.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setDeleteConfirmOpen(false);
    setItemToDelete(null);

    setLoading(true);
    setError('');
    try {
      await api.items.delete(id);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Products</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Product Catalog</h1>
            <p>Manage product items, SKU codes, supplier correlations, and conversion multipliers.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Product
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Filter / Sort / View Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
            <option value="all">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
          </select>
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="name">Sort: Name</option>
            <option value="date">Sort: Date Added</option>
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Items list / table */}
        {loading ? (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: '40px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <h3>No products catalogued</h3>
              <p>Add products to your operational catalog to start monitoring stock and generating purchase orders.</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Add First Product
              </button>
            </div>
          </div>
        ) : (
          (() => {
            const filtered = items
              .filter(item => {
                const q = search.toLowerCase();
                if (q && !item.displayName.toLowerCase().includes(q) && !item.productCode?.toLowerCase().includes(q)) return false;
                if (vendorFilter !== 'all' && item.vendorId !== vendorFilter) return false;
                return true;
              })
              .sort((a, b) => {
                if (sortBy === 'name') return a.displayName.localeCompare(b.displayName);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });

            if (filtered.length === 0) return (
              <div className="card" style={{ padding: '48px 24px' }}>
                <div className="empty-state"><h3>No results found</h3><p>Try adjusting your search or filter.</p></div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '24px'
              }} className="stagger">
                {filtered.map((item) => {
                  const isSecondaryConfigured = item.displayUnitName && item.displayUnitName !== item.baseUnitName;
                  return (
                    <div
                      key={item.id}
                      className="card card-hover"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '20px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.displayName}
                            </h3>
                            {item.vendor && (
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                {item.vendor.displayName}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setEditDisplayName(item.displayName);
                                setEditVendorId(item.vendorId);
                                setEditBaseUnitName(item.baseUnitName);
                                setEditDisplayUnitName(isSecondaryConfigured ? item.displayUnitName : '');
                                setEditMultiplier(isSecondaryConfigured ? item.multiplier : '');
                                setEditProductCode(item.productCode || '');
                                setEditNote(item.note || '');
                                setError('');
                                setShowEditModal(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id, item.displayName)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', color: '#ef4444', borderColor: '#fca5a5' }}
                              title="Delete Product"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                          {item.productCode && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>SKU:</span>
                              <span className="mono" style={{ color: 'var(--text-secondary)' }}>{item.productCode}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Units:</span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="badge badge-neutral">{item.baseUnitName}</span>
                              {isSecondaryConfigured && (
                                <>
                                  <span style={{ color: 'var(--text-tertiary)' }}>←</span>
                                  <span className="badge badge-teal">{item.displayUnitName}</span>
                                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>x{item.multiplier}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {item.note && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Note:</span>
                              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }} className="line-clamp-2">{item.note}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.6875rem',
                        color: 'var(--text-tertiary)'
                      }}>
                        <span className="mono">ID: {item.id.substring(0, 8)}</span>
                        {item.createdAt && <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '24px' }}>Display Name</th>
                        <th>Assigned Vendor</th>
                        <th>Product Code</th>
                        <th>Notes</th>
                        <th>pack size</th>
                        <th>individual stock unit</th>
                        <th style={{ textAlign: 'center' }}>Multiplier</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const isSecondaryConfigured = item.displayUnitName && item.displayUnitName !== item.baseUnitName;
                        return (
                          <tr key={item.id}>
                            <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.displayName}
                            </td>
                            <td>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {item.vendor?.displayName || 'Unknown Vendor'}
                              </span>
                            </td>
                            <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              {item.productCode || '—'}
                            </td>
                            <td style={{ color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.note || '—'}
                            </td>
                            <td>
                              {isSecondaryConfigured ? (
                                <span className="badge badge-teal">
                                  {item.displayUnitName}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-neutral">
                                {item.baseUnitName}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'center', fontSize: '0.8125rem' }}>
                              {isSecondaryConfigured ? item.multiplier : '1'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-green">
                                <span className="badge-dot" />
                                Active
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setEditDisplayName(item.displayName);
                                    setEditVendorId(item.vendorId);
                                    setEditBaseUnitName(item.baseUnitName);
                                    setEditDisplayUnitName(isSecondaryConfigured ? item.displayUnitName : '');
                                    setEditMultiplier(isSecondaryConfigured ? item.multiplier : '');
                                    setEditProductCode(item.productCode || '');
                                    setEditNote(item.note || '');
                                    setError('');
                                    setShowEditModal(true);
                                  }}
                                  className="btn btn-secondary btn-sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(item.id, item.displayName)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}

        {/* Modal Create Form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-md">
              <button
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Catalog New Product</h2>
                <p>Register product SKUs, baseline operational measurements, and procurement units.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              {vendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You must onboard at least one vendor before adding products.</p>
                  <Link href="/dashboard/admin/vendors" className="btn btn-primary">
                    Go Onboard Vendor
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="item-name">Product Name *</label>
                    <input
                      id="item-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input"
                      placeholder="e.g. Chicken Shawarma Cone (30lb)"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="label" htmlFor="item-vendor">Assigned Vendor *</label>
                      <select
                        id="item-vendor"
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="input"
                      >
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label" htmlFor="item-code">Product Code (SKU)</label>
                      <input
                        id="item-code"
                        type="text"
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value)}
                        className="input"
                        placeholder="e.g. SH-KIT-010"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="item-note">Notes</label>
                    <input
                      id="item-note"
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="input"
                      placeholder="e.g. Premium Breast / Thigh Mix"
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="label" htmlFor="item-base">individual stock unit *</label>
                      <input
                        id="item-base"
                        type="text"
                        required
                        value={baseUnitName}
                        onChange={(e) => setBaseUnitName(e.target.value)}
                        className="input"
                        placeholder="e.g. lbs, oz, each"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="label" htmlFor="item-secondary">pack size</label>
                        <input
                          id="item-secondary"
                          type="text"
                          value={displayUnitName}
                          onChange={(e) => setDisplayUnitName(e.target.value)}
                          className="input"
                          placeholder="e.g. case, box, cone"
                        />
                      </div>

                      <div hidden={!displayUnitName}>
                        <label className="label" htmlFor="item-multiplier">Multiplier *</label>
                        <input
                          id="item-multiplier"
                          type="number"
                          step="any"
                          min="0.0001"
                          disabled={!displayUnitName}
                          value={multiplier}
                          onChange={(e) => setMultiplier(e.target.value === '' ? '' : Number(e.target.value))}
                          className="input mono"
                          placeholder="e.g. 30"
                        />
                      </div>
                    </div>
                    {displayUnitName && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
                        Conversion: 1 {displayUnitName} = {multiplier || 'X'} {baseUnitName}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {formSubmitting ? 'Saving...' : 'Save Product'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal Edit Form */}
        {showEditModal && selectedItem && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-md">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Edit Product Item</h2>
                <p>Modify catalog options, procurement vendor matching, and conversion rules.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label" htmlFor="edit-item-name">Product Name *</label>
                  <input
                    id="edit-item-name"
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-item-vendor">Assigned Vendor *</label>
                    <select
                      id="edit-item-vendor"
                      value={editVendorId}
                      onChange={(e) => setEditVendorId(e.target.value)}
                      className="input"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-item-code">Product Code (SKU)</label>
                    <input
                      id="edit-item-code"
                      type="text"
                      value={editProductCode}
                      onChange={(e) => setEditProductCode(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="edit-item-note">Notes</label>
                  <input
                    id="edit-item-note"
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="input"
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-item-base">individual stock unit *</label>
                    <input
                      id="edit-item-base"
                      type="text"
                      required
                      value={editBaseUnitName}
                      onChange={(e) => setEditBaseUnitName(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label className="label" htmlFor="edit-item-secondary">pack size</label>
                      <input
                        id="edit-item-secondary"
                        type="text"
                        value={editDisplayUnitName}
                        onChange={(e) => setEditDisplayUnitName(e.target.value)}
                        className="input"
                      />
                    </div>

                    <div hidden={!editDisplayUnitName} >
                      <label className="label" htmlFor="edit-item-multiplier">Multiplier *</label>
                      <input
                        id="edit-item-multiplier"
                        type="number"
                        step="any"
                        min="0.0001"
                        disabled={!editDisplayUnitName}
                        value={editMultiplier}
                        onChange={(e) => setEditMultiplier(e.target.value === '' ? '' : Number(e.target.value))}
                        className="input mono"
                      />
                    </div>
                  </div>
                  {editDisplayUnitName && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '-8px' }}>
                      Conversion: 1 {editDisplayUnitName} = {editMultiplier || 'X'} {editBaseUnitName}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedItem(null);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {formSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Delete Product?"
          message={`Are you sure you want to delete "${itemToDelete?.name}"? This will remove this product from all locations, stock records, and purchase orders.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
          }}
        />
      </div>
    </AdminGuard>
  );
}
