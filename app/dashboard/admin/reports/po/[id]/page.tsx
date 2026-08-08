'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../../../utils/api';
import AdminGuard from '../../../../components/AdminGuard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { useAuth } from '../../../../../context/AuthContext';

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

  const handleSaveDraft = async () => {
    if (!po) return;
    setActionLoading(true);
    setError('');
    try {
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
      await fetchPODetails();
      setIsEditingDraft(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update purchase order.');
    } finally {
      setActionLoading(false);
    }
  };

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

      // Reload details
      await fetchPODetails();
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
      await fetchPODetails();
    } catch (err: any) {
      setError(err.message || 'Failed to send purchase order email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const pdfDownloadUrl = po ? api.purchaseOrders.getPdfUrl(po.id) : '#';

  const isDraft = po?.status === 'DRAFT';
  const activeItems = (po?.items || []).filter(item => {
    if (isDraft) return true;
    return Number(item.quantity || 0) > 0;
  });

  const totalUnits = activeItems.reduce((acc, item) => {
    const qty = isDraft ? (editedQuantities[item.itemId] ?? Number(item.quantity)) : Number(item.quantity);
    return acc + Number(qty || 0);
  }, 0);

  const shortPoId = po?.id ? po.id.slice(0, 8).toUpperCase() : 'N/A';
  const vendorAddressParts = [po?.vendor?.address1, po?.vendor?.address2, po?.vendor?.address3].filter(Boolean);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '920px', margin: '0 auto' }}>
        {/* Navigation Breadcrumbs & Actions Bar (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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
              <>


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
              </>
            )}
          </div>
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
          <>
            {/* Top Status & Controls Notification (Hidden on Print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
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
                      ? 'Review and adjust line item quantities before approving.'
                      : po.approvedBy || po.approver
                        ? `Approved by ${po.approver?.fullName || po.approvedBy || 'Manager'}${po.approvedAt ? ` on ${new Date(po.approvedAt).toLocaleDateString()}` : ''}`
                        : 'Completed & verified purchase order document.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {isDraft && (
                  <>
                    {isModified && (
                      <button
                        onClick={handleSaveDraft}
                        disabled={actionLoading}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '8px 16px' }}
                      >
                        💾 {actionLoading ? 'Saving...' : 'Save Draft'}
                      </button>
                    )}

                    <button
                      onClick={handleApproveClick}
                      disabled={actionLoading}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '8px 20px', backgroundColor: '#C0212F', borderColor: '#C0212F' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      {actionLoading ? 'Approving...' : isModified ? 'Save & Approve PO' : 'Approve Purchase Order'}
                    </button>
                  </>
                )}

                {!isDraft && (
                  <button
                    onClick={handleTriggerSendEmail}
                    disabled={actionLoading}
                    className="btn btn-secondary btn-sm"
                    style={{
                      backgroundColor: 'var(--accent-subtle)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent)',
                      padding: '8px 16px',
                      fontWeight: 600,
                    }}
                  >
                    ✉️ {po.emailsSent ? 'Re-email Supplier' : 'Email Order to Supplier'}
                  </button>
                )}
              </div>
            </div>

            {/* Dispatched Notification Card */}
            {po.emailsSent && (
              <div
                className="no-print card"
                style={{
                  padding: '14px 20px',
                  borderLeft: '4px solid #10b981',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>📬</span>
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Dispatched to Supplier:</strong>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{po.emailsSent}</span>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div
                className="no-print"
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--danger)',
                  backgroundColor: 'var(--danger-subtle)',
                  border: '1px solid var(--danger-border)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                ⚠️ {error}
              </div>
            )}

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

              <div style={{ padding: '36px 44px 44px 44px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Document Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  {/* Brand & Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: '#C0212F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        letterSpacing: '-0.03em',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(192, 33, 47, 0.25)',
                      }}
                    >
                      SG
                    </div>
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: '1.375rem',
                          fontWeight: 800,
                          color: '#C0212F',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.1,
                        }}
                      >
                        SHAWARMA GUYS
                      </h2>
                      <div
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          color: '#6b7280',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          marginTop: '4px',
                        }}
                      >
                        AUTOMATED INVENTORY AUDIT CONTROL SYSTEM
                      </div>
                    </div>
                  </div>

                  {/* Document Title & Status on the Right */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#111827',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      PURCHASE ORDER
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        backgroundColor: isDraft ? '#fffbeb' : '#ecfdf5',
                        color: isDraft ? '#b45309' : '#047857',
                        border: `1px solid ${isDraft ? '#fde68a' : '#a7f3d0'}`,
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'currentColor',
                        }}
                      />
                      {po.status}
                    </span>
                  </div>
                </div>

                {/* Accent Separator Line */}
                <div
                  style={{
                    width: '100%',
                    height: '2px',
                    backgroundColor: '#E03E4B',
                    margin: '0',
                  }}
                />

                {/* Two-Column Address Grid (FROM / TO) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                    padding: '8px 0',
                  }}
                >
                  {/* Left Column: FROM (Location / Store) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#C0212F',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      FROM:
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
                      {po.location?.name || 'Shawarma Guys Store'}
                    </div>
                    {po.location?.address && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>
                        {po.location.address}
                      </div>
                    )}
                    {po.location?.phone && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                        <span style={{ color: '#9ca3af' }}>Phone:</span> {po.location.phone}
                      </div>
                    )}
                    {po.location?.email && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                        <span style={{ color: '#9ca3af' }}>Email:</span> {po.location.email}
                      </div>
                    )}
                  </div>

                  {/* Right Column: TO (Vendor / Supplier) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: '#C0212F',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      TO:
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
                      {po.vendor?.displayName || 'Supplier Wholesaler'}
                    </div>
                    {vendorAddressParts.length > 0 && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                        {vendorAddressParts.join('\n')}
                      </div>
                    )}
                    {po.vendor?.phone && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                        <span style={{ color: '#9ca3af' }}>Phone:</span> {po.vendor.phone}
                      </div>
                    )}
                    {po.vendor?.email && (
                      <div style={{ fontSize: '0.8125rem', color: '#4b5563' }}>
                        <span style={{ color: '#9ca3af' }}>Email:</span> {po.vendor.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider Line */}
                <div style={{ width: '100%', height: '1px', backgroundColor: '#e5e7eb' }} />

                {/* Metadata Grid (4-Column Info Card) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '16px',
                    padding: '14px 18px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PO ID:
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', fontFamily: 'monospace', marginTop: '2px' }}>
                      #{shortPoId}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Date Generated:
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Created By:
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginTop: '2px' }}>
                      {po.createdBy || 'System'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Approved By:
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: po.approver || po.approvedBy ? '#047857' : '#9ca3af', marginTop: '2px' }}>
                      {po.approver?.fullName || po.approvedBy || (isDraft ? 'Pending Approval' : 'Manager')}
                    </div>
                  </div>
                </div>

                {/* Ordered Items Table (Matches PDF layout exactly) */}
                <div>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '20%',
                            borderRight: '1px solid #e5e7eb',
                          }}
                        >
                          Product Code
                        </th>
                        <th
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '45%',
                            borderRight: '1px solid #e5e7eb',
                          }}
                        >
                          Item Name
                        </th>
                        <th
                          style={{
                            padding: '10px 14px',
                            textAlign: 'left',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '18%',
                            borderRight: '1px solid #e5e7eb',
                          }}
                        >
                          Ordering Unit
                        </th>
                        <th
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#1f2937',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            width: '17%',
                          }}
                        >
                          Order Quantity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
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

                              {/* Item Name */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  color: '#111827',
                                  fontWeight: 600,
                                  borderRight: '1px solid #e5e7eb',
                                  verticalAlign: 'middle',
                                }}
                              >
                                <div>{name}</div>
                                {item?.spanishName && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>
                                    {item.spanishName}
                                  </div>
                                )}
                                {item?.note && (
                                  <div style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 400 }}>
                                    {item.note}
                                  </div>
                                )}
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

                              {/* Order Quantity */}
                              <td
                                style={{
                                  padding: '11px 14px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {isDraft ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="no-print"
                                      onClick={() => handleQtyChange(poItem.itemId, Math.max(0, currentQty - 1))}
                                      style={{
                                        width: '24px',
                                        height: '24px',
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
                                        width: '65px',
                                        padding: '4px 6px',
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        fontSize: '0.9375rem',
                                        color: '#111827',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        backgroundColor: '#ffffff',
                                        outline: 'none',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="no-print"
                                      onClick={() => handleQtyChange(poItem.itemId, currentQty + 1)}
                                      style={{
                                        width: '24px',
                                        height: '24px',
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
                                  <span
                                    style={{
                                      fontSize: '1rem',
                                      fontWeight: 800,
                                      color: '#111827',
                                      letterSpacing: '-0.02em',
                                    }}
                                  >
                                    {Number(poItem.quantity || 0).toFixed(0)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Table Footer Total */}
                    <tfoot>
                      <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={2} style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                          Total Line Items: {activeItems.length}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
                          Total Quantity:
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: '#C0212F' }}>
                          {totalUnits.toFixed(0)}
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
          </>
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

      {/* Print Styles for High-Quality Physical PO Printing */}
      <style jsx global>{`
        @media print {
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
