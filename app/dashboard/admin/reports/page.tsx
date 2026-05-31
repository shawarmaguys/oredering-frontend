'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy: string;
  slackMessageTs?: string;
  submittedAt: string;
  approvedAt?: string;
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
  createdByUser?: {
    fullName: string;
  };
  approvedBy?: string;
  approvedByUser?: {
    fullName: string;
  };
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED' | 'CANCELLED';
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pos' | 'stock'>('pos');
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Details State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poDetailsLoading, setPoDetailsLoading] = useState(false);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');

  // Approve confirmation state
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [poToApprove, setPoToApprove] = useState<{ id: string; vendorName: string } | null>(null);

  // Post approval and email modal states
  const [postApprovalPO, setPostApprovalPO] = useState<{ id: string; vendorName: string; vendorEmail: string; locationName: string } | null>(null);
  const [sendEmailState, setSendEmailState] = useState<{
    isOpen: boolean;
    poId: string;
    vendorName: string;
    emails: string;
    subject: string;
    body: string;
  } | null>(null);

  // Editable purchase order quantities state
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

  const handleQtyChange = (itemId: string, newQty: number) => {
    setEditedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, newQty)
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedPO) return;
    setActionLoading(true);
    setError('');
    try {
      const payloadItems = Object.keys(editedQuantities).map(itemId => ({
        itemId,
        quantity: editedQuantities[itemId]
      }));
      const updatedPO = await api.purchaseOrders.update(selectedPO.id, {
        items: payloadItems
      });

      // Update state
      setPoItems(updatedPO.items || []);
      const qties: Record<string, number> = {};
      (updatedPO.items || []).forEach((item: any) => {
        qties[item.itemId] = Number(item.quantity);
      });
      setEditedQuantities(qties);

      // Force refresh of initial list to keep sync
      await fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to update purchase order.');
    } finally {
      setActionLoading(false);
    }
  };

  const isModified = Object.keys(editedQuantities).some(itemId => {
    const originalItem = poItems.find(i => i.itemId === itemId);
    return originalItem && Number(originalItem.quantity) !== editedQuantities[itemId];
  });

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

  const fetchSinglePO = async (poId: string) => {
    setPoDetailsLoading(true);
    setSelectedPO(null);
    setPoItems([]);
    setEditedQuantities({});
    try {
      const details = await api.purchaseOrders.get(poId);
      const mappedPO: PurchaseOrder = {
        id: details.id,
        vendorId: details.vendorId || details.vendor_id,
        vendor: details.vendor,
        locationId: details.locationId || details.location_id,
        location: details.location,
        stockRecordId: details.stockRecordId || details.stock_record_id,
        createdBy: details.createdBy || details.created_by,
        createdByUser: details.creator || details.createdByUser || details.createdBy_user || { fullName: 'Worker Portal' },
        approvedBy: details.approvedBy || details.approved_by,
        approvedByUser: details.approver || details.approvedByUser || details.approvedBy_user,
        status: details.status,
        pdfUrl: details.pdfUrl || details.pdf_url,
        notes: details.notes,
        createdAt: details.createdAt || details.created_at,
        approvedAt: details.approvedAt || details.approved_at,
      };
      setSelectedPO(mappedPO);
      setPoItems(details.items || []);

      // Populate edited quantities
      const qties: Record<string, number> = {};
      (details.items || []).forEach((item: any) => {
        qties[item.itemId] = Number(item.quantity);
      });
      setEditedQuantities(qties);
    } catch (err: any) {
      console.error('Failed to auto-load single PO details', err);
    } finally {
      setPoDetailsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'pos') {
        const data = await api.purchaseOrders.list();
        const mapped = data.map((po: any) => ({
          id: po.id,
          vendorId: po.vendorId || po.vendor_id,
          vendor: po.vendor,
          locationId: po.locationId || po.location_id,
          location: po.location,
          stockRecordId: po.stockRecordId || po.stock_record_id,
          createdBy: po.createdBy || po.created_by,
          createdByUser: po.creator || po.createdByUser || po.createdBy_user || { fullName: 'Worker Portal' },
          approvedBy: po.approvedBy || po.approved_by,
          approvedByUser: po.approver || po.approvedByUser || po.approvedBy_user,
          status: po.status,
          pdfUrl: po.pdfUrl || po.pdf_url,
          notes: po.notes,
          createdAt: po.createdAt || po.created_at,
          approvedAt: po.approvedAt || po.approved_at,
        }));
        setPos(mapped);
      } else {
        const data = await api.stockRecords.list();
        const mapped = data.map((sr: any) => ({
          id: sr.id,
          locationId: sr.locationId || sr.location_id,
          location: sr.location,
          submittedBy: sr.submittedBy || sr.submitted_by || 'System',
          slackMessageTs: sr.slackMessageTs || sr.slack_message_ts,
          submittedAt: sr.submittedAt || sr.submitted_at,
          approvedAt: sr.approvedAt || sr.approved_at,
        }));
        setStockRecords(mapped);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePOSelect = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setPoDetailsLoading(true);
    setPoItems([]);
    setEditedQuantities({});
    try {
      const details = await api.purchaseOrders.get(po.id);
      setPoItems(details.items || []);

      // Populate edited quantities
      const qties: Record<string, number> = {};
      (details.items || []).forEach((item: any) => {
        qties[item.itemId] = Number(item.quantity);
      });
      setEditedQuantities(qties);
    } catch (err: any) {
      console.error('Failed to load PO details', err);
    } finally {
      setPoDetailsLoading(false);
    }
  };

  const handleApprovePOClick = (id: string, vendorName: string) => {
    setPoToApprove({ id, vendorName });
    setApproveConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!poToApprove) return;
    const { id } = poToApprove;
    setApproveConfirmOpen(false);
    setPoToApprove(null);

    setActionLoading(true);
    setError('');

    try {
      const approved = await api.purchaseOrders.approve(id);
      await fetchInitialData();

      // Open post-approval options
      setPostApprovalPO({
        id: approved.id,
        vendorName: approved.vendor?.displayName || 'Supplier',
        vendorEmail: approved.vendor?.email || '',
        locationName: approved.location?.name || 'Store'
      });
      setSelectedPO(null);
    } catch (err: any) {
      setError(err.message || 'Failed to approve purchase order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostApprovalNo = () => {
    setPostApprovalPO(null);
  };

  const handlePostApprovalYes = () => {
    if (!postApprovalPO) return;
    const poIdShort = postApprovalPO.id.slice(0, 8);
    setSendEmailState({
      isOpen: true,
      poId: postApprovalPO.id,
      vendorName: postApprovalPO.vendorName,
      emails: postApprovalPO.vendorEmail,
      subject: `Purchase Order #${poIdShort} - Shawarma Guys (${postApprovalPO.locationName})`,
      body: ''
    });
    setPostApprovalPO(null);
  };

  const handleTriggerSendEmail = (po: any) => {
    const poIdShort = po.id.slice(0, 8);
    const locationName = po.location?.name || 'Store';
    setSendEmailState({
      isOpen: true,
      poId: po.id,
      vendorName: po.vendor?.displayName || 'Supplier',
      emails: po.vendor?.email || '',
      subject: `Purchase Order #${poIdShort} - Shawarma Guys (${locationName})`,
      body: ''
    });
  };

  const handleSendEmail = async () => {
    if (!sendEmailState) return;
    const { poId, emails, subject, body } = sendEmailState;

    setActionLoading(true);
    setError('');

    const emailsArray = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emailsArray.length === 0) {
      setError('Please provide at least one recipient email address.');
      setActionLoading(false);
      return;
    }

    try {
      await api.purchaseOrders.send(poId, {
        emails: emailsArray,
        subject: subject || undefined,
        body: body || undefined
      });

      setSendEmailState(null);
      await fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to send purchase order email.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            onClick={() => {
              setSelectedPO(null);
              setActiveTab('pos');
            }}
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
            onClick={() => {
              setSelectedPO(null);
              setActiveTab('stock');
            }}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
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
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '840px', margin: '0 auto' }}>
          {loading ? (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton" style={{ height: '40px', width: '100%' }} />
              <div className="skeleton" style={{ height: '32px', width: '100%' }} />
              <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            </div>
          ) : activeTab === 'pos' ? (
            (() => {
              const filtered = pos.filter(po => {
                const q = search.toLowerCase();
                if (q && !po.vendor?.displayName?.toLowerCase().includes(q) && !po.location?.name?.toLowerCase().includes(q)) return false;
                if (statusFilter !== 'all' && po.status !== statusFilter) return false;
                return true;
              }).sort((a, b) => {
                return sortBy === 'date_desc'
                  ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              });

              if (filtered.length === 0) return (
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <h3>No results found</h3>
                    <p>Try adjusting your search or filters.</p>
                  </div>
                </div>
              );

              return viewMode === 'tile' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '24px' }} className="stagger">
                  {filtered.map(po => {
                    const isSelected = selectedPO?.id === po.id;
                    return (
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
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          boxShadow: isSelected ? 'var(--shadow-md), 0 0 0 2px var(--accent-subtle)' : 'var(--shadow-sm)',
                          backgroundColor: isSelected ? 'var(--bg-sunken)' : 'var(--bg-card)',
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
                          <span className={`badge ${po.status === 'SENT' ? 'badge-success' :
                              po.status === 'GENERATED' ? 'badge-success' :
                                'badge-amber'
                            }`}>
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
                    )
                  })}
                </div>
              ) : (
                <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-responsive-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: '24px' }}>PO ID</th>
                          <th>Vendor</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right', paddingRight: '24px' }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(po => (
                          <tr key={po.id} onClick={() => router.push(`/dashboard/admin/reports/po/${po.id}`)} style={{ cursor: 'pointer' }} className="card-hover">
                            <td className="mono" style={{ paddingLeft: '24px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{po.id.substring(0, 8)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.vendor?.displayName || 'Supplier'}</td>
                            <td>{po.location?.name || 'Store'}</td>
                            <td>
                              <span className={`badge ${po.status === 'SENT' || po.status === 'GENERATED' ? 'badge-success' : 'badge-amber'}`}>
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
                </div>
              );
            })()
          ) : (
            (() => {
              const filtered = stockRecords.filter(sr => {
                const q = search.toLowerCase();
                if (q && !sr.location?.name?.toLowerCase().includes(q) && !sr.submittedBy?.toLowerCase().includes(q)) return false;
                return true;
              }).sort((a, b) => {
                return sortBy === 'date_desc'
                  ? new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                  : new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
              });

              if (filtered.length === 0) return (
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <h3>No results found</h3>
                    <p>Try adjusting your search query.</p>
                  </div>
                </div>
              );

              return viewMode === 'tile' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '24px' }} className="stagger">
                  {filtered.map(sr => (
                    <div key={sr.id} className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>ID: {sr.id.substring(0, 8)}...</span>
                          <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{sr.location?.name || 'Store Location'}</h4>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Submitted by: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{sr.submittedBy || 'Worker'}</strong>
                          </span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="table-responsive-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: '24px' }}>Record ID</th>
                          <th>Store Location</th>
                          <th>Submitted By</th>
                          <th style={{ textAlign: 'right', paddingRight: '24px' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(sr => (
                          <tr key={sr.id}>
                            <td className="mono" style={{ paddingLeft: '24px', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{sr.id.substring(0, 8)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sr.location?.name || 'Store Location'}</td>
                            <td>{sr.submittedBy || 'Worker'}</td>
                            <td style={{ textAlign: 'right', paddingRight: '24px', fontSize: '0.8125rem' }}>
                              {new Date(sr.submittedAt).toLocaleDateString()} <span className="mono" style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }}>{new Date(sr.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()
          )}
        </div>
        <ConfirmDialog
          isOpen={approveConfirmOpen}
          title="Approve Purchase Order?"
          message={`Are you sure you want to approve this purchase order for ${approveConfirmOpen ? poToApprove?.vendorName : ''}?`}
          onConfirm={handleConfirmApprove}
          onCancel={() => {
            setApproveConfirmOpen(false);
            setPoToApprove(null);
          }}
        />

        {/* Post-Approval Options Prompt Modal */}
        {postApprovalPO && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div className="card" style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--green-subtle)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                fontSize: '1.5rem',
                border: '1px solid var(--green-border)'
              }}>
                ✓
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Purchase Order Approved!
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The purchase order for <strong>{postApprovalPO.vendorName}</strong> has been successfully authorized and moved to generated status.
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Would you like to send it to the supplier via email now?
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={handlePostApprovalNo}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                >
                  No, Later
                </button>
                <button
                  onClick={handlePostApprovalYes}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                >
                  Yes, Send Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Purchase Order Email Modal */}
        {sendEmailState && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div className="card" style={{
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Email Purchase Order
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Send official PDF purchase order to <strong>{sendEmailState.vendorName}</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recipient Email(s)</label>
                  <input
                    type="text"
                    value={sendEmailState.emails}
                    onChange={(e) => setSendEmailState(prev => prev ? { ...prev, emails: e.target.value } : null)}
                    placeholder="supplier@example.com, manager@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--bg-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    Separate multiple recipient emails with commas.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Subject</label>
                  <input
                    type="text"
                    value={sendEmailState.subject}
                    onChange={(e) => setSendEmailState(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    placeholder="Enter email subject"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--bg-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Optional Custom Message (HTML / Text)</label>
                  <textarea
                    rows={4}
                    value={sendEmailState.body}
                    onChange={(e) => setSendEmailState(prev => prev ? { ...prev, body: e.target.value } : null)}
                    placeholder="Add custom notes or instructions for the supplier..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--bg-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    Leave blank to send standard automated vendor procurement message.
                  </span>
                </div>
              </div>

              {error && (
                <div style={{ fontSize: '0.75rem', color: 'var(--red)', backgroundColor: 'var(--red-subtle)', border: '1px solid var(--red-border)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => {
                    setSendEmailState(null);
                    setError('');
                  }}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  {actionLoading ? 'Sending...' : '✉️ Send Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
