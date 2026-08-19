'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../../../utils/api';
import AdminGuard from '../../../../components/AdminGuard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { useAuth } from '../../../../../context/AuthContext';
import { useReports } from '../../../../../context/ReportsContext';

interface POItem {
  id: string;
  itemId: string;
  quantity: number;
  unitName: string;
  secondaryQuantity: number | null;
  basicQuantity: number | null;
  normalizedQuantity: number | null;
  parLevel: number | null;
  suggestedQuantity: number | null;
  item?: {
    displayName: string;
    baseUnitName: string;
    displayUnitName: string;
    multiplier: number;
    productCode?: string;
    note?: string;
    spanishName?: string;
  };
}

interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendor?: {
    displayName: string;
    email?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    phone?: string;
  };
  locationId: string;
  location?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  status: string;
  createdAt: string;
  approvedAt?: string;
  createdBy?: string;
  approvedBy?: string;
  notes?: string;
  pdfUrl?: string;
  emailsSent?: string;
  items: POItem[];
  approver?: {
    fullName: string;
    email: string;
    role?: string;
  };
}

export default function PODetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const { refreshPurchaseOrders } = useReports();
  const isManager = user?.role === 'MANAGER';

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Editable purchase order quantities state
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // Modals state
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  const [sendEmailState, setSendEmailState] = useState<{
    isOpen: boolean;
    poId: string;
    vendorName: string;
    vendorEmails: string[];
    selectedVendorEmails: string[];
    customEmails: string;
    subject: string;
    body: string;
    notes: string;
  } | null>(null);

  const fetchPODetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.purchaseOrders.get(id);
      setPo(res);

      // Initialize edit form inputs
      const qties: Record<string, number> = {};
      res.items?.forEach((item: POItem) => {
        qties[item.itemId] = Number(item.quantity);
      });
      setEditedQuantities(qties);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPODetails();
    }
  }, [id]);

  const handleQtyChange = (itemId: string, newQty: number) => {
    setEditedQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, newQty)
    }));
  };

  const isModified = po?.items?.some(item => {
    return Number(item.quantity) !== (editedQuantities[item.itemId] ?? 0);
  });

  const handleApproveClick = () => {
    setApproveConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!po) return;
    setApproveConfirmOpen(false);
    setActionLoading(true);
    setError('');

    try {
      if (isModified) {
        const payloadItems = Object.keys(editedQuantities).map(itemId => {
          const item = po.items?.find((i: POItem) => i.itemId === itemId);
          return {
            itemId,
            quantity: editedQuantities[itemId],
            displayUnitName: item?.item?.displayUnitName || item?.unitName || ''
          };
        });
        await api.purchaseOrders.update(po.id, {
          items: payloadItems
        });
      }

      const approved = await api.purchaseOrders.approve(po.id);

      const poIdShort = approved.id.slice(0, 8).toUpperCase();
      const locationName = approved.location?.name || 'Store';
      const vendorEmails = (approved.vendor?.email || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);

      setSendEmailState({
        isOpen: true,
        poId: approved.id,
        vendorName: approved.vendor?.displayName || 'Supplier',
        vendorEmails,
        selectedVendorEmails: [...vendorEmails],
        customEmails: '',
        subject: `Purchase Order #${poIdShort} - Shawarma Guys (${locationName})`,
        body: '',
        notes: approved.notes || po.notes || ''
      });

      // Reload details and update global context
      await Promise.all([fetchPODetails(), refreshPurchaseOrders()]);
    } catch (err: any) {
      setError(err.message || 'Failed to approve purchase order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerSendEmail = () => {
    if (!po) return;
    const poIdShort = po.id.slice(0, 8).toUpperCase();
    const locationName = po.location?.name || 'Store';
    const vendorEmails = (po.vendor?.email || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter((e: string) => e.length > 0);

    setSendEmailState({
      isOpen: true,
      poId: po.id,
      vendorName: po.vendor?.displayName || 'Supplier',
      vendorEmails,
      selectedVendorEmails: [...vendorEmails],
      customEmails: '',
      subject: `Purchase Order #${poIdShort} - Shawarma Guys (${locationName})`,
      body: '',
      notes: po.notes || ''
    });
  };

  const handleSendEmail = async () => {
    if (!sendEmailState) return;
    const { poId, selectedVendorEmails, customEmails, notes } = sendEmailState;

    setActionLoading(true);
    setError('');

    const customEmailsArray = customEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const emailsArray = Array.from(new Set([...selectedVendorEmails, ...customEmailsArray]));

    if (emailsArray.length === 0) {
      setError('Please provide at least one recipient email address.');
      setActionLoading(false);
      return;
    }

    try {
      await api.purchaseOrders.send(poId, {
        emails: emailsArray,
        notes: notes || undefined
      });

      setSendEmailState(null);
      await Promise.all([fetchPODetails(), refreshPurchaseOrders()]);
    } catch (err: any) {
      setError(err.message || 'Failed to send purchase order email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCountedDisplay = (poItem: POItem) => {
    const displayUnit = poItem.item?.displayUnitName;
    const baseUnit = poItem.item?.baseUnitName;

    if (poItem.basicQuantity === null && poItem.secondaryQuantity === null) {
      return null;
    }

    const sec = poItem.secondaryQuantity !== null ? Number(poItem.secondaryQuantity) : 0;
    const basic = poItem.basicQuantity !== null ? Number(poItem.basicQuantity) : 0;

    const formatNum = (num: number) => {
      const rounded = Math.round(num * 10) / 10;
      return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
    };

    if (displayUnit && baseUnit) {
      if (sec > 0 && basic > 0) {
        return `${formatNum(sec)} ${displayUnit} + ${formatNum(basic)} ${baseUnit}`;
      } else if (sec > 0) {
        return `${formatNum(sec)} ${displayUnit}`;
      } else {
        return `${formatNum(basic)} ${baseUnit}`;
      }
    } else if (baseUnit) {
      return `${formatNum(basic)} ${baseUnit}`;
    } else if (displayUnit) {
      return `${formatNum(sec)} ${displayUnit}`;
    }
    return null;
  };

  const pdfDownloadUrl = po ? api.purchaseOrders.getPdfUrl(po.id) : '#';

  const isDraft = po?.status === 'DRAFT';
  const activeItems = (po?.items || []).filter(item => {
    if (isDraft) return true;
    return Number(item.quantity || 0) > 0;
  });

  const totalSuggestedUnits = activeItems.reduce((acc, item) => {
    const suggested = item.suggestedQuantity !== null ? Number(item.suggestedQuantity) : Number(item.quantity || 0);
    return acc + suggested;
  }, 0);

  const totalOrderedUnits = activeItems.reduce((acc, item) => {
    const qty = isDraft ? (editedQuantities[item.itemId] ?? Number(item.quantity)) : Number(item.quantity);
    return acc + Number(qty || 0);
  }, 0);

  const shortPoId = po?.id ? po.id.slice(0, 8).toUpperCase() : 'N/A';
  const vendorAddressParts = [po?.vendor?.address1, po?.vendor?.address2, po?.vendor?.address3].filter(Boolean);

  return (
    <AdminGuard>
      <div className="po-page-wrapper">
        {/* Navigation Breadcrumbs & Top Status Bar (Pinned at top, Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {/* Navigation Breadcrumbs & Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="breadcrumb" style={{ margin: 0 }}>
              <Link href="/dashboard">Dashboard</Link>
              <span className="breadcrumb-sep">/</span>
              <Link href="/dashboard/admin/reports">Purchase Orders</Link>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">PO #{shortPoId}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/dashboard/admin/reports" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </Link>

              {po && (
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Open or download official PDF"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Official PDF
                </a>
              )}
            </div>
          </div>

          {/* Top Status & Controls Notification */}
          {po && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isDraft ? 'rgba(217, 119, 6, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${isDraft ? 'rgba(217, 119, 6, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isDraft ? '#d97706' : '#10b981',
                    color: '#fff',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                  }}
                >
                  {isDraft ? '📝' : '✓'}
                </span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Purchase Order Status: <strong style={{ color: isDraft ? '#d97706' : '#10b981' }}>{po.status}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {isDraft
                      ? 'Review stock audit breakdown and adjust line item quantities before approving.'
                      : po.approvedBy || po.approver
                        ? `Approved by ${po.approver?.fullName || po.approvedBy || 'Manager'}${po.approvedAt ? ` on ${new Date(po.approvedAt).toLocaleDateString()}` : ''}`
                        : 'Completed & verified purchase order document.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {isDraft && (
                  <button
                    onClick={handleApproveClick}
                    disabled={actionLoading}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '8px 20px', backgroundColor: '#C0212F', borderColor: '#C0212F' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {actionLoading ? 'Approving...' : 'Approve Purchase Order'}
                  </button>
                )}

                {/* Re-Email / Dispatch Action Button */}
                {po.status !== 'DRAFT' && (
                  <button
                    onClick={() => {
                      const vendorEmails = po.vendor?.email
                        ? po.vendor.email.split(',').map(e => e.trim()).filter(Boolean)
                        : [];
                      setSendEmailState({
                        isOpen: true,
                        poId: po.id,
                        vendorName: po.vendor?.displayName || 'Supplier',
                        vendorEmails: vendorEmails,
                        selectedVendorEmails: vendorEmails,
                        customEmails: '',
                        subject: `Purchase Order #${shortPoId}`,
                        body: '',
                        notes: po.notes || '',
                      });
                    }}
                    disabled={actionLoading}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 16px' }}
                    title="Send or resend this Purchase Order via email"
                  >
                    ✉️ {po.emailsSent ? 'Re-email Supplier' : 'Email Order to Supplier'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dispatched Notification Card */}
          {po?.emailsSent && (
            <div
              className="card"
              style={{
                padding: '10px 16px',
                borderLeft: '4px solid #10b981',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>📬</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Dispatched to Supplier:</strong>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{po.emailsSent}</span>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--danger)',
                backgroundColor: 'var(--danger-subtle)',
                border: '1px solid var(--danger-border)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="card" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="skeleton" style={{ height: '36px', width: '40%' }} />
            <div className="skeleton" style={{ height: '18px', width: '75%' }} />
            <div className="skeleton" style={{ height: '240px', width: '100%' }} />
          </div>
        ) : error && !po ? (
          <div className="card" style={{ padding: '24px', border: '1px solid var(--danger-border)', backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)' }}>
            ⚠️ {error}
          </div>
        ) : po ? (
          <div className="po-scroll-container">
            {/* ========================================================================= */}
            {/* REALISTIC PHYSICAL PURCHASE ORDER DOCUMENT SHEET (MATCHES PDF EXACTLY)   */}
            {/* ========================================================================= */}
            <div
              className="po-document-sheet"
              style={{
                backgroundColor: '#ffffff',
                color: '#1f2937',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid #e5e7eb',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                position: 'relative',
                margin: '0 auto',
                width: '100%',
                maxWidth: '860px',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Top Crimson Red Accent Bar */}
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: '#C0212F',
                }}
              />

              <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header: Brand, Title & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f3f4f6', paddingBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: '#C0212F',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        letterSpacing: '-0.02em',
                        boxShadow: '0 4px 6px -1px rgba(192, 33, 47, 0.2)',
                      }}
                    >
                      SG
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.375rem', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                        SHAWARMA GUYS
                      </h2>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', color: '#9ca3af', textTransform: 'uppercase', marginTop: '2px' }}>
                        AUTOMATED INVENTORY AUDIT CONTROL SYSTEM
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                      PURCHASE ORDER
                    </div>
                    <div style={{ display: 'inline-block', marginTop: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          backgroundColor: isDraft ? '#fef3c7' : '#d1fae5',
                          color: isDraft ? '#92400e' : '#065f46',
                          border: `1px solid ${isDraft ? '#fde68a' : '#a7f3d0'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isDraft ? '#d97706' : '#10b981',
                          }}
                        />
                        {po.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Info Cards: Location (FROM) & Vendor (TO) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {/* FROM / BUYER: Restaurant Location */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Buyer / Store Location
                    </div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                      {po.location?.name || 'Restaurant Branch'}
                    </div>
                    {po.location?.address && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>
                        {po.location.address}
                      </div>
                    )}
                    {po.location?.phone && (
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '4px' }}>
                        Tel: <span style={{ color: '#374151', fontWeight: 500 }}>{po.location.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* TO / SELLER: Vendor */}
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Supplier / Vendor
                    </div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                      {po.vendor?.displayName || 'Supplier Name'}
                    </div>
                    {vendorAddressParts.length > 0 && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>
                        {vendorAddressParts.join(', ')}
                      </div>
                    )}
                    {po.vendor?.phone && (
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '4px' }}>
                        Phone: <span style={{ color: '#374151', fontWeight: 500 }}>{po.vendor.phone}</span>
                      </div>
                    )}
                    {po.vendor?.email && (
                      <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                        Email: <span style={{ color: '#374151', fontWeight: 500 }}>{po.vendor.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Row: PO #, Generated Date, Created By, Approved By */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                    padding: '14px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>PO Number</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', fontFamily: 'monospace', marginTop: '2px' }}>
                      {shortPoId}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Date Generated</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {po.createdAt ? new Date(po.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Created By</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {po.createdBy || 'System Automated'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Approved By</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: po.approvedBy || po.approver ? '#111827' : '#9ca3af', marginTop: '2px' }}>
                      {po.approver?.fullName || po.approvedBy || (isDraft ? 'Pending Approval' : 'Verified')}
                    </div>
                  </div>
                </div>

                {/* Ordered Items Table (Matches PDF layout exactly) */}
                <div
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'visible',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0,
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                            backgroundColor: '#f9fafb',
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '13%',
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Product Code
                        </th>
                        <th
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                            backgroundColor: '#f9fafb',
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '39%',
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Item & Stock Audit
                        </th>
                        <th
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                            backgroundColor: '#f9fafb',
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '14%',
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Ordering Unit
                        </th>
                        <th
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                            backgroundColor: '#f9fafb',
                            padding: '10px 14px',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '16%',
                            borderRight: '1px solid #e5e7eb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Suggested
                        </th>
                        <th
                          style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                            backgroundColor: '#f9fafb',
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '18%',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          Order Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                            No items included in this purchase order.
                          </td>
                        </tr>
                      ) : (
                        activeItems.map((poItem, idx) => {
                          const item = poItem.item;
                          const code = item?.productCode || 'N/A';
                          const name = item?.displayName || 'Unknown Item';
                          const unit = poItem.unitName || item?.displayUnitName || item?.baseUnitName || '';
                          const isAlt = idx % 2 === 1;

                          const currentQty = isDraft
                            ? editedQuantities[poItem.itemId] ?? Number(poItem.quantity)
                            : Number(poItem.quantity);

                          const countedStr = getCountedDisplay(poItem);
                          const hasSuggested = poItem.suggestedQuantity !== null;
                          const suggestedNum = hasSuggested ? Number(poItem.suggestedQuantity) : null;
                          const isDiffFromSuggested = hasSuggested && currentQty !== suggestedNum;

                          return (
                            <tr
                              key={poItem.id}
                              style={{
                                backgroundColor: isAlt ? '#fafafa' : '#ffffff',
                                borderBottom: '1px solid #e5e7eb',
                              }}
                            >
                              {/* Product Code */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  fontSize: '0.8125rem',
                                  color: '#4b5563',
                                  fontFamily: 'monospace',
                                  borderRight: '1px solid #e5e7eb',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {code}
                              </td>

                              {/* Item & Stock Audit */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  color: '#111827',
                                  fontWeight: 600,
                                  borderRight: '1px solid #e5e7eb',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <div style={{ fontSize: '0.9375rem', color: '#111827' }}>{name}</div>
                                {item?.spanishName && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400, marginTop: '1px' }}>
                                    {item.spanishName}
                                  </div>
                                )}
                                {item?.note && (
                                  <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 400, fontStyle: 'italic', marginTop: '1px' }}>
                                    {item.note}
                                  </div>
                                )}

                                {/* Stock Audit Details (Counted, Par, Normalized) */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                  {countedStr && (
                                    <span
                                      title="Physical stock counted during store audit"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                      }}
                                    >
                                      <span style={{ color: '#9ca3af', fontWeight: 500 }}>Counted:</span> {countedStr}
                                    </span>
                                  )}

                                  {poItem.parLevel !== null && (
                                    <span
                                      title="Configured store target par level"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                      }}
                                    >
                                      <span style={{ color: '#9ca3af', fontWeight: 500 }}>Par:</span> {poItem.parLevel}
                                    </span>
                                  )}

                                  {user?.role === 'ADMIN' && poItem.normalizedQuantity !== null && (
                                    <span
                                      title="Total stock normalized in base units (Admin audit)"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        color: '#4b5563',
                                      }}
                                    >
                                      <span style={{ color: '#9ca3af', fontWeight: 500 }}>Norm:</span> {Number(poItem.normalizedQuantity).toFixed(1)} {item?.baseUnitName || ''}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Ordering Unit */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  fontSize: '0.8125rem',
                                  color: '#4b5563',
                                  borderRight: '1px solid #e5e7eb',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#f3f4f6',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: '#374151',
                                  }}
                                >
                                  {unit}
                                </span>
                              </td>

                              {/* Suggested Quantity */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  borderRight: '1px solid #e5e7eb',
                                }}
                              >

                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #bfdbfe',
                                    minWidth: '38px',
                                  }}
                                  title="System recommended purchase quantity (Par Level - Counted Stock)"
                                >
                                  {suggestedNum !== null ? suggestedNum.toFixed(0) : '—'}
                                </span>
                              </td>

                              {/* Order Quantity */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {isDraft ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      className="no-print"
                                      onClick={() => handleQtyChange(poItem.itemId, Math.max(0, currentQty - 1))}
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#ffffff',
                                        color: '#374151',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentQty}
                                      onChange={(e) => handleQtyChange(poItem.itemId, parseFloat(e.target.value) || 0)}
                                      style={{
                                        width: '60px',
                                        padding: '4px 6px',
                                        textAlign: 'right',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '0.9375rem',
                                        fontWeight: 700,
                                        color: '#111827',
                                        backgroundColor: '#ffffff',
                                        outline: 'none',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="no-print"
                                      onClick={() => handleQtyChange(poItem.itemId, currentQty + 1)}
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '4px',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#ffffff',
                                        color: '#374151',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#C0212F' }}>
                                    {currentQty.toFixed(0)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Table Totals Footer (Matches PDF Table Summary) */}
                    <tfoot>
                      <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={2} style={{ padding: '12px 14px', fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>
                          Total Items: <strong style={{ color: '#111827' }}>{activeItems.length}</strong>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                          Totals:
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                            Suggested
                          </div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1d4ed8' }}>
                            {totalSuggestedUnits.toFixed(0)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ fontSize: '0.625rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>
                            Ordered
                          </div>
                          <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#C0212F' }}>
                            {totalOrderedUnits.toFixed(0)}
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Notes / Dispatch Instructions Section (Matches PDF Notes Box) */}
                {po.notes ? (
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#111827' }}>
                      Notes / Dispatch Instructions:
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {po.notes}
                    </div>
                  </div>
                ) : null}

                {/* Document Legal Footer (Matches PDF Footer exactly) */}
                <div
                  style={{
                    textAlign: 'center',
                    paddingTop: '20px',
                    borderTop: '1px solid #f3f4f6',
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    fontStyle: 'italic',
                    letterSpacing: '0.01em',
                  }}
                >
                  This purchase order is generated electronically and represents an official ordering commitment.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Approve Confirmation Modal */}
        <ConfirmDialog
          isOpen={approveConfirmOpen}
          title="Approve Purchase Order?"
          message={`Are you sure you want to approve this purchase order for ${approveConfirmOpen && po ? po.vendor?.displayName : ''}?`}
          onConfirm={handleConfirmApprove}
          onCancel={() => setApproveConfirmOpen(false)}
        />

        {/* Send Purchase Order Email Modal */}
        {sendEmailState && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '24px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-modal)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Email Purchase Order
                </h3>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  Send official PDF purchase order to <strong>{sendEmailState.vendorName}</strong>.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recipient Email(s)</label>

                  {sendEmailState.vendorEmails.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Vendor Default Emails:</span>
                      {sendEmailState.vendorEmails.map(email => (
                        <label key={email} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={sendEmailState.selectedVendorEmails.includes(email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSendEmailState(prev => prev ? { ...prev, selectedVendorEmails: [...prev.selectedVendorEmails, email] } : null);
                              } else {
                                setSendEmailState(prev => prev ? { ...prev, selectedVendorEmails: prev.selectedVendorEmails.filter(x => x !== email) } : null);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          {email}
                        </label>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                    {sendEmailState.vendorEmails.length > 0 ? 'Additional Emails (comma separated):' : 'Enter Emails (comma separated):'}
                  </span>
                  <input
                    type="text"
                    value={sendEmailState.customEmails}
                    onChange={(e) => setSendEmailState(prev => prev ? { ...prev, customEmails: e.target.value } : null)}
                    placeholder="supplier@example.com, manager@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--bg-sunken)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* PDF Custom Note */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Purchase Order Note / Dispatch Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={sendEmailState.notes}
                    onChange={(e) => setSendEmailState(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Enter dispatch times, delivery notes, or instructions. This note will appear inside the generated PDF purchase order."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={() => setSendEmailState(null)}
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
                  style={{ padding: '8px 20px', backgroundColor: '#C0212F', borderColor: '#C0212F' }}
                >
                  {actionLoading ? 'Sending...' : '✉️ Send Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll and Print Styles for High-Quality Physical PO & Pinned Toolbar */}
      <style jsx global>{`
        .po-page-wrapper {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - 112px);
          max-width: 920px;
          margin: 0 auto;
          gap: 12px;
          overflow: hidden;
        }

        @media (max-width: 1024px) {
          .po-page-wrapper {
            height: calc(100dvh - 96px);
          }
        }

        @media (max-width: 640px) {
          .po-page-wrapper {
            height: calc(100dvh - 88px);
          }
        }

        .po-scroll-container {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding: 4px 6px 32px 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
        }

        .po-scroll-container::-webkit-scrollbar {
          width: 6px;
        }

        .po-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .po-scroll-container::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.4);
          border-radius: 999px;
        }

        .po-scroll-container::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }

        @media print {
          .po-page-wrapper {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .po-scroll-container {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
          }
          .no-print,
          nav,
          header,
          .navbar,
          .breadcrumb,
          button,
          aside {
            display: none !important;
          }
          body,
          main,
          #__next {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .po-document-sheet {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </AdminGuard>
  );
}
