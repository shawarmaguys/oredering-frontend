'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../utils/api';

export default function ManagerDashboard() {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPendingReviews() {
      try {
        const data = await api.purchaseOrders.list('DRAFT');
        setPendingReviews(data);
      } catch (err) {
        console.error('Failed to load pending reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPendingReviews();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Manager Portal</h1>
          <p>Review worker inventory submissions, fix anomalies, and authorize purchase orders for distribution.</p>
        </div>
      </div>

      <div className="split-layout stagger">
        
        {/* Main Content - Pending Tasks (comes first in DOM for mobile top placement) */}
        <div>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pending Stock Reviews
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Audits awaiting approval before supplier dispatches.
                </p>
              </div>
              <span className="badge badge-amber">
                <span className="badge-dot" />
                {pendingReviews.length} Action Needed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="skeleton" style={{ height: '72px', width: '100%' }} />
                  <div className="skeleton" style={{ height: '72px', width: '100%' }} />
                </div>
              ) : pendingReviews.length > 0 ? (
                pendingReviews.map((po) => (
                  <div
                    key={po.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: 'var(--bg-sunken)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          PO: {po.id.substring(0, 8)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          • {new Date(po.createdAt).toLocaleDateString()} {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <strong>{po.vendor?.displayName || 'Supplier'}</strong> at {po.location?.name || 'Store'}
                      </p>
                    </div>
                    <Link href={`/dashboard/admin/reports/po/${po.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      Review values
                    </Link>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3>No pending reviews</h3>
                  <p>All store counts are approved and synchronized.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Audits & Purchase Orders Link Card */}
          <div className="card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-sunken) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--green-subtle)',
              border: '1px solid var(--green-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--green)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Reports & Audits
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Access all completed kitchen stock sheets and track the stage of procurement purchase orders.
              </p>
            </div>
            <Link href="/dashboard/admin/reports" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', textAlign: 'center', textDecoration: 'none', justifyContent: 'center' }}>
              View Reports & Audits
            </Link>
          </div>

          {/* Create New PO Card */}
          <div className="card" style={{
            padding: '24px',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Create New PO
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Manually draft a custom purchase order and generate vendor-ready CSV / Slack sheets.
              </p>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}>
              Create Purchase Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
