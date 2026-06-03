'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../../../utils/api';
import AdminGuard from '../../../../components/AdminGuard';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ConfirmDialog } from '../../../../../components/ConfirmDialog';

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
    multiplier: number;
  };
}

interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendor?: {
    displayName: string;
    email?: string;
  };
  locationId: string;
  location?: {
    name: string;
  };
  status: string;
  createdAt: string;
  notes?: string;
  pdfUrl?: string;
  emailsSent?: string;
  items: POItem[];
  approver?: {
    fullName: string;
    email: string;
  };
}

export default function PODetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Editable purchase order quantities state
  const [editedQuantities, setEditedQuantities] = useState<Record<string, number>>({});

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
      const payloadItems = Object.keys(editedQuantities).map(itemId => ({
        itemId,
        quantity: editedQuantities[itemId]
      }));
      await api.purchaseOrders.update(po.id, {
        items: payloadItems
      });
      await fetchPODetails();
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
        const payloadItems = Object.keys(editedQuantities).map(itemId => ({
          itemId,
          quantity: editedQuantities[itemId]
        }));
        await api.purchaseOrders.update(po.id, {
          items: payloadItems
        });
      }

      const approved = await api.purchaseOrders.approve(po.id);

      const poIdShort = approved.id.slice(0, 8);
      const locationName = approved.location?.name || 'Store';
      const vendorEmails = (approved.vendor?.email || '').split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0);
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
    const poIdShort = po.id.slice(0, 8);
    const locationName = po.location?.name || 'Store';
    const vendorEmails = (po.vendor?.email || '').split(',').map((e: string) => e.trim()).filter((e: string) => e.length > 0);
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

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/dashboard/admin/reports">Purchase Orders and Stock records</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Purchase Order</span>
        </div>

        {/* Back Link */}
        <div style={{ alignSelf: 'flex-start' }}>
          <Link href="/dashboard/admin/reports" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
            ← Back to Purchase Orders and Stock records
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton" style={{ height: '32px', width: '30%' }} />
            <div className="skeleton" style={{ height: '16px', width: '100%' }} />
            <div className="skeleton" style={{ height: '16px', width: '80%' }} />
          </div>
        ) : error && !po ? (
          <div className="card" style={{ padding: '24px', border: '1px solid var(--red-border)', backgroundColor: 'var(--red-subtle)', color: 'var(--red)' }}>
            ⚠️ {error}
          </div>
        ) : po ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderTop: '3px solid var(--accent)' }}>
              <div>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>PO ID: {po.id}</span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 8px 0' }}>
                  {po.vendor?.displayName || 'Supplier Wholesaler'}
                </h1>

                <div style={{ display: 'flex', gap: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Location: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{po.location?.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Date: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{new Date(po.createdAt).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Stage / Status</span>
                <span className={`badge ${po.status === 'SENT' ? 'badge-success' :
                  po.status === 'GENERATED' ? 'badge-success' :
                    po.status === 'APPROVED' ? 'badge-success' :
                      'badge-amber'
                  }`} style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                  <span className="badge-dot" />
                  {po.status}
                </span>
              </div>
            </div>

            {po.notes && (
              <div className="card" style={{ padding: '16px 20px', borderLeft: '3px solid var(--accent-subtle)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                "{po.notes}"
              </div>
            )}

            {po.emailsSent && (
              <div className="card" style={{ padding: '16px 20px', borderLeft: '3px solid var(--green)', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✉️ Dispatched Recipients
                </span>
                <span>This purchase order was emailed to: <strong>{po.emailsSent}</strong></span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--red)', backgroundColor: 'var(--red-subtle)', border: '1px solid var(--red-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Main PO Items Grid */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                Ordered Items Breakdown
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {po.items?.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', paddingTop: '24px', paddingBottom: '24px' }}>
                    No items in this purchase order.
                  </p>
                ) : (
                  po.items.map((item) => {
                    const displayUnit = item.unitName || 'cases';
                    const baseUnit = item.item?.baseUnitName || 'pcs';
                    const isSameUnit = baseUnit.toLowerCase() === displayUnit.toLowerCase() || Number(item.item?.multiplier) === 1;

                    let countedStr = '';
                    if (item.secondaryQuantity !== null && item.basicQuantity !== null) {
                      if (isSameUnit) {
                        countedStr = `${Number(item.secondaryQuantity).toFixed(1)} ${displayUnit}`;
                      } else {
                        countedStr = `${Number(item.secondaryQuantity).toFixed(0)} ${displayUnit} + ${Number(item.basicQuantity).toFixed(1)} ${baseUnit}`;
                      }
                    } else {
                      countedStr = 'N/A';
                    }

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '16px',
                          backgroundColor: 'var(--bg-sunken)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '24px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                              {item.item?.displayName || 'Item'}
                            </strong>
                            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                              Unit: {displayUnit}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px 16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div>Counted: <strong style={{ color: 'var(--text-primary)' }}>{countedStr}</strong></div>
                            <div>Normalized (Cases): <strong style={{ color: 'var(--text-primary)' }}>{item.normalizedQuantity !== null ? `${item.normalizedQuantity}` : 'N/A'}</strong></div>
                            <div>Par (Cases): <strong style={{ color: 'var(--text-primary)' }}>{item.parLevel !== null ? `${item.parLevel}` : 'N/A'}</strong></div>
                            <div>Suggested PO (Cases): <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{item.suggestedQuantity !== null ? `${item.suggestedQuantity}` : 'N/A'}</strong></div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
                          {po.status === 'DRAFT' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Order Qty ({displayUnit})</label>
                              <input
                                type="number"
                                min="0"
                                value={editedQuantities[item.itemId] ?? Number(item.quantity)}
                                onChange={(e) => handleQtyChange(item.itemId, parseFloat(e.target.value) || 0)}
                                style={{
                                  width: '100px',
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  backgroundColor: 'var(--bg-elevated)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  outline: 'none',
                                  fontWeight: 'bold',
                                  textAlign: 'center'
                                }}
                              />
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Ordered Qty</span>
                              <strong style={{ fontSize: '1.125rem', color: 'var(--green)' }}>{item.quantity} {displayUnit}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '12px' }}>
                {po.status === 'DRAFT' && (
                  <button
                    onClick={handleApproveClick}
                    disabled={actionLoading}
                    className="btn btn-primary"
                    style={{ padding: '10px 24px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 18, height: 18, marginRight: 4 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                    </svg>
                    {actionLoading ? 'Approving...' : (isModified ? 'Save & Approve Purchase Order' : 'Approve Purchase Order')}
                  </button>
                )}

                {po.status !== 'DRAFT' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8125rem',
                    color: '#047857',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #10b981',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16, color: '#10b981' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12z" />
                    </svg>
                    <span>Already approved by: <strong>{po.approver?.fullName || 'Manager'}</strong></span>
                  </div>
                )}

                {po.status !== 'DRAFT' && (
                  <button
                    onClick={handleTriggerSendEmail}
                    disabled={actionLoading}
                    className="btn btn-secondary"
                    style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', color: 'var(--accent)', padding: '10px 20px' }}
                  >
                    ✉️ Email Order to Supplier
                  </button>
                )}

                {po.pdfUrl && (
                  <a
                    href={po.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '10px 20px' }}
                  >
                    📄 View Order PDF
                  </a>
                )}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Recipient Email(s)</label>
                  
                  {sendEmailState.vendorEmails.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>Vendor Emails:</span>
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
                      outline: 'none'
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
                      fontFamily: 'inherit'
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
