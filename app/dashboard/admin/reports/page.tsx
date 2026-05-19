'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy: string;
  submittedByUser?: {
    fullName: string;
  };
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

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

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
          createdByUser: po.createdByUser || po.createdBy_user || { fullName: 'Worker Portal' },
          approvedBy: po.approvedBy || po.approved_by,
          approvedByUser: po.approvedByUser || po.approvedBy_user,
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
          submittedBy: sr.submittedBy || sr.submitted_by,
          submittedByUser: sr.submittedByUser || sr.submittedBy_user || { fullName: 'System Worker' },
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
    try {
      const details = await api.purchaseOrders.get(po.id);
      setPoItems(details.items || []);
    } catch (err: any) {
      console.error('Failed to load PO details', err);
    } finally {
      setPoDetailsLoading(false);
    }
  };

  const handleApprovePO = async (id: string) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) return;
    setActionLoading(true);
    setError('');

    try {
      await api.purchaseOrders.approve(id);
      setSelectedPO(null);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve purchase order.');
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
          <span className="breadcrumb-current">Reports</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Reports & Purchase Orders</h1>
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

        <div className="split-layout">
          {/* Main List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '40px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                <div className="skeleton" style={{ height: '32px', width: '100%' }} />
              </div>
            ) : activeTab === 'pos' ? (
              pos.length === 0 ? (
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <h3>No purchase orders found</h3>
                    <p>Purchase orders automatically generated from worker stock records will appear here for manager review.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="stagger">
                  {pos.map((po) => {
                    const isSelected = selectedPO?.id === po.id;
                    return (
                      <button
                        key={po.id}
                        onClick={() => handlePOSelect(po)}
                        className="card card-hover"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '20px 24px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '16px',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          boxShadow: isSelected ? 'var(--shadow-md), 0 0 0 2px var(--accent-subtle)' : 'var(--shadow-sm)',
                          backgroundColor: isSelected ? 'var(--bg-sunken)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`badge ${
                              po.status === 'GENERATED' ? 'badge-amber' :
                              po.status === 'SENT' ? 'badge-teal' :
                              po.status === 'ACKNOWLEDGED' ? 'badge-green' :
                              'badge-neutral'
                            }`}>
                              {po.status}
                            </span>
                            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                              ID: {po.id.substring(0, 8)}
                            </span>
                          </div>
                          
                          <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {po.vendor?.displayName || 'Unknown Supplier'}
                          </h4>
                          
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Store: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{po.location?.name || 'Main Kitchen'}</strong>
                          </span>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Generated</span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {new Date(po.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              stockRecords.length === 0 ? (
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                      </svg>
                    </div>
                    <h3>No stock records</h3>
                    <p>Stock counts submitted by kitchen workers will be logged here chronologically.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="stagger">
                  {stockRecords.map((sr) => (
                    <div
                      key={sr.id}
                      className="card"
                      style={{
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>ID: {sr.id.substring(0, 8)}...</span>
                        <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {sr.location?.name || 'Store Location'}
                        </h4>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          Submitted by: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{sr.submittedByUser?.fullName || 'Worker'}</strong>
                        </span>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Timestamp</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
                          {new Date(sr.submittedAt).toLocaleDateString()}
                        </span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {new Date(sr.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Details / Actions Sidebar */}
          <div>
            {activeTab === 'pos' && selectedPO ? (
              <div className="card animate-fade-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '3px',
                  background: 'linear-gradient(90deg, var(--accent) 0%, var(--green) 100%)'
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>PO Details</h3>
                  <button
                    onClick={() => setSelectedPO(null)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '4px'
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '0.8125rem',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Supplier</span>
                    <strong style={{ color: 'var(--accent)', fontSize: '0.9375rem' }}>
                      {selectedPO.vendor?.displayName || 'Wholesaler'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Store Location</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedPO.location?.name || 'Store'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Status</span>
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedPO.status}
                    </span>
                  </div>

                  {selectedPO.notes && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Notes</span>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>
                        "{selectedPO.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Ordered Items</span>
                  {poDetailsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0' }}>
                      <div className="skeleton" style={{ height: '16px', width: '100%' }} />
                      <div className="skeleton" style={{ height: '16px', width: '80%' }} />
                    </div>
                  ) : poItems.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '4px 0' }}>
                      No items listed in this purchase order.
                    </p>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {poItems.map((item: any) => (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-sunken)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.item?.displayName || 'Item'}
                          </span>
                          <span className="mono" style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--accent-subtle)',
                            color: 'var(--accent)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--accent-border)'
                          }}>
                            {item.quantity} {item.unitName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approval Action */}
                {selectedPO.status === 'GENERATED' && (
                  <button
                    onClick={() => handleApprovePO(selectedPO.id)}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                    </svg>
                    {actionLoading ? 'Approving...' : 'Approve Purchase Order'}
                  </button>
                )}
                
                {selectedPO.pdfUrl && (
                  <a
                    href={selectedPO.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '12px', justifyContent: 'center', textDecoration: 'none' }}
                  >
                    📄 View Order PDF
                  </a>
                )}
              </div>
            ) : (
              <div style={{
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--text-tertiary)'
              }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>👈</span>
                <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {activeTab === 'pos'
                    ? 'Select a purchase order from the list to review specific line items and authorize procurement approval.'
                    : 'Submitted stock sheets are immutable audit records generated directly by kitchen employees.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
