'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocations } from '../../../context/LocationsContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy: string;
  slackMessageTs?: string;
  submittedAt: string;
  isCompleted?: boolean;
}

interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendor?: {
    displayName: string;
  };
  locationId: string;
  location?: {
    name: string;
  };
  stockRecordId?: string;
  createdBy: string;
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED' | 'CANCELLED' | 'APPROVED' | string;
  pdfUrl?: string;
  notes?: string;
  emailsSent?: string;
  createdAt: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const { locations } = useLocations();
  const { selectedLocationId } = useLocationFilter();
  const [activeTab, setActiveTab] = useState<'pos' | 'stock'>('pos');
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const poId = params.get('poId');
      if (poId) {
        router.push(`/dashboard/admin/reports/po/${poId}`);
      }
      if (window.innerWidth < 640) {
        setViewMode('tile');
      }
    }
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'pos') {
        const res = await api.purchaseOrders.list();
        const rawList = Array.isArray(res) ? res : res.data || [];
        const mapped = rawList.map((po: any) => ({
          id: po.id,
          vendorId: po.vendorId || po.vendor_id,
          vendor: po.vendor,
          locationId: po.locationId || po.location_id,
          location: po.location,
          stockRecordId: po.stockRecordId || po.stock_record_id,
          createdBy: po.createdBy || po.created_by,
          status: po.status,
          pdfUrl: po.pdfUrl || po.pdf_url,
          notes: po.notes,
          emailsSent: po.emailsSent || po.emails_sent,
          createdAt: po.createdAt || po.created_at,
        }));
        setPos(mapped);
      } else {
        const res = await api.stockRecords.list();
        const rawList = Array.isArray(res) ? res : res.data || [];
        const mapped = rawList.map((sr: any) => ({
          id: sr.id,
          locationId: sr.locationId || sr.location_id,
          location: sr.location,
          submittedBy: sr.submittedBy || sr.submitted_by || 'Worker',
          slackMessageTs: sr.slackMessageTs || sr.slack_message_ts,
          submittedAt: sr.submittedAt || sr.submitted_at,
          isCompleted: sr.isCompleted ?? sr.is_completed ?? true,
        }));
        setStockRecords(mapped);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="page-container">
        {/* Pinned Top Bar */}
        <div className="page-header-sticky">
          {/* Navigation Breadcrumbs */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Purchase Orders and Stock records</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div className="page-header-text">
              <h1>Purchase Orders and Stock records</h1>
              <p>Verify kitchen stock sheets and authorize supplier purchase orders.</p>
            </div>
          </div>

          {/* Tab System Controls */}
          <div className="tabs-container" style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('pos')}
              className="tabs-btn"
              style={{
                padding: '12px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'pos' ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === 'pos' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📋 Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className="tabs-btn"
              style={{
                padding: '12px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'stock' ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === 'stock' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              📊 Submitted Stock Records
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Filter / Sort / View Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {selectedLocationId !== 'all' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 500 }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {locations.find(l => l.id === selectedLocationId)?.name || 'Selected Location'}
              </div>
            )}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {activeTab === 'pos' && (
              <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="GENERATED">Generated</option>
                <option value="SENT">Sent</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}
            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginLeft: 'auto' }}>
              <button onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              </button>
              <button onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="page-content-scroll">
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton" style={{ height: '40px', width: '100%' }} />
              <div className="skeleton" style={{ height: '32px', width: '100%' }} />
              <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            </div>
          </div>
        ) : activeTab === 'pos' ? (
          (() => {
            const filtered = pos.filter(po => {
              const q = search.toLowerCase();
              if (q && !po.vendor?.displayName?.toLowerCase().includes(q) && !po.location?.name?.toLowerCase().includes(q)) return false;
              if (statusFilter !== 'all' && po.status !== statusFilter) return false;
              if (selectedLocationId !== 'all' && po.locationId !== selectedLocationId) return false;
              return true;
            }).sort((a, b) => {
              let cmp = 0;
              if (sortColumn === 'vendor') cmp = (a.vendor?.displayName || '').localeCompare(b.vendor?.displayName || '');
              else if (sortColumn === 'location') cmp = (a.location?.name || '').localeCompare(b.location?.name || '');
              else if (sortColumn === 'status') cmp = a.status.localeCompare(b.status);
              else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              return sortDir === 'asc' ? cmp : -cmp;
            });

            if (filtered.length === 0) return (
              <div className="page-content-scroll">
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <h3>No purchase orders found</h3>
                    <p>Try adjusting your search query or filters.</p>
                  </div>
                </div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div className="page-content-scroll">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '24px' }} className="stagger">
                  {filtered.map(po => (
                    <button
                      key={po.id}
                      onClick={() => router.push(`/dashboard/admin/reports/po/${po.id}`)}
                      className="card card-hover"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                        backgroundColor: 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>PO ID: {po.id.substring(0, 8)}...</span>
                          <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {po.vendor?.displayName || 'Wholesaler Supplier'}
                          </h4>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Location: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{po.location?.name || 'Store'}</strong>
                          </span>
                        </div>
                        <span className={`badge ${po.status === 'SENT' || po.status === 'GENERATED' || po.status === 'APPROVED' ? 'badge-success' : 'badge-amber'}`}>
                          <span className="badge-dot" />
                          {po.status}
                        </span>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', width: '100%' }}>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Date Created</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {new Date(po.createdAt).toLocaleDateString()}
                          </span>
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '24px' }}>PO ID</th>
                      <th onClick={() => handleSort('vendor')} style={{ cursor: 'pointer', userSelect: 'none' }}>Vendor {sortColumn === 'vendor' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('location')} style={{ cursor: 'pointer', userSelect: 'none' }}>Location {sortColumn === 'location' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {sortColumn === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('createdAt')} style={{ textAlign: 'right', paddingRight: '24px', cursor: 'pointer', userSelect: 'none' }}>Created {sortColumn === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(po => (
                      <tr key={po.id} onClick={() => router.push(`/dashboard/admin/reports/po/${po.id}`)} style={{ cursor: 'pointer' }} className="card-hover">
                        <td className="mono" style={{ paddingLeft: '24px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{po.id.substring(0, 8)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.vendor?.displayName || 'Supplier'}</td>
                        <td>{po.location?.name || 'Store'}</td>
                        <td>
                          <span className={`badge ${po.status === 'SENT' || po.status === 'GENERATED' || po.status === 'APPROVED' ? 'badge-success' : 'badge-amber'}`}>
                            <span className="badge-dot" />
                            {po.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '24px', fontSize: '0.8125rem' }}>
                          {new Date(po.createdAt).toLocaleDateString()} <span className="mono" style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>{new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : (
          (() => {
            const filtered = stockRecords.filter(sr => {
              const q = search.toLowerCase();
              if (q && !sr.location?.name?.toLowerCase().includes(q) && !sr.submittedBy?.toLowerCase().includes(q)) return false;
              if (selectedLocationId !== 'all' && sr.locationId !== selectedLocationId) return false;
              return true;
            }).sort((a, b) => {
              let cmp = 0;
              if (sortColumn === 'location') cmp = (a.location?.name || '').localeCompare(b.location?.name || '');
              else if (sortColumn === 'submittedBy') cmp = (a.submittedBy || '').localeCompare(b.submittedBy || '');
              else if (sortColumn === 'status') cmp = (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0);
              else cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
              return sortDir === 'asc' ? cmp : -cmp;
            });

            if (filtered.length === 0) return (
              <div className="page-content-scroll">
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <h3>No stock records found</h3>
                    <p>Try adjusting your search query.</p>
                  </div>
                </div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div className="page-content-scroll">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '24px' }} className="stagger">
                  {filtered.map(sr => (
                    <button
                      key={sr.id}
                      onClick={() => router.push(`/dashboard/admin/reports/stock-record/${sr.id}`)}
                      className="card card-hover"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '20px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                        backgroundColor: 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div>
                          <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>ID: {sr.id.substring(0, 8)}...</span>
                          <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{sr.location?.name || 'Store Location'}</h4>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Submitted by: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{sr.submittedBy || 'Worker'}</strong>
                          </span>
                        </div>
                        <span className={`badge ${sr.isCompleted ? 'badge-success' : 'badge-amber'}`}>
                          <span className="badge-dot" />
                          {sr.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', width: '100%' }}>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Timestamp</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {new Date(sr.submittedAt).toLocaleDateString()}
                          </span>
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {new Date(sr.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '24px' }}>Record ID</th>
                      <th onClick={() => handleSort('location')} style={{ cursor: 'pointer', userSelect: 'none' }}>Store Location {sortColumn === 'location' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('submittedBy')} style={{ cursor: 'pointer', userSelect: 'none' }}>Submitted By {sortColumn === 'submittedBy' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {sortColumn === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                      <th onClick={() => handleSort('submittedAt')} style={{ textAlign: 'right', paddingRight: '24px', cursor: 'pointer', userSelect: 'none' }}>Timestamp {sortColumn === 'submittedAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(sr => (
                      <tr key={sr.id} onClick={() => router.push(`/dashboard/admin/reports/stock-record/${sr.id}`)} style={{ cursor: 'pointer' }} className="card-hover">
                        <td className="mono" style={{ paddingLeft: '24px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{sr.id.substring(0, 8)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sr.location?.name || 'Store Location'}</td>
                        <td>{sr.submittedBy || 'Worker'}</td>
                        <td>
                          <span className={`badge ${sr.isCompleted ? 'badge-success' : 'badge-amber'}`}>
                            <span className="badge-dot" />
                            {sr.isCompleted ? 'Completed' : 'In Progress'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '24px', fontSize: '0.8125rem' }}>
                          {new Date(sr.submittedAt).toLocaleDateString()} <span className="mono" style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>{new Date(sr.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        )}
      </div>
    </AdminGuard>
  );
}
