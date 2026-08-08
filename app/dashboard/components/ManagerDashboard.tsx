'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { useLocationFilter } from '../../context/LocationFilterContext';

export default function ManagerDashboard() {
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { selectedLocationId } = useLocationFilter();

  useEffect(() => {
    async function loadPendingReviews() {
      try {
        const res = await api.purchaseOrders.list();
        const data = Array.isArray(res) ? res : res.data || [];
        const filtered = data.filter((po: any) => po.status === 'DRAFT' || po.status === 'GENERATED');
        setPendingReviews(filtered);
      } catch (err) {
        console.error('Failed to load pending reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPendingReviews();
  }, []);

  const displayedReviews = pendingReviews.filter(
    (po) => selectedLocationId === 'all' || po.locationId === selectedLocationId
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{t('manager_portal')}</h1>
          <p>{t('manager_desc')}</p>
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
                  {t('pending_stock_reviews')}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {t('audits_awaiting_approval')}
                </p>
              </div>
              <span className="badge badge-amber">
                <span className="badge-dot" />
                {displayedReviews.length} {t('action_needed')}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="skeleton" style={{ height: '72px', width: '100%' }} />
                  <div className="skeleton" style={{ height: '72px', width: '100%' }} />
                </div>
              ) : displayedReviews.length > 0 ? (
                displayedReviews.map((po) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          PO: {po.id.substring(0, 8)}
                        </span>
                        <span className={`badge ${po.status === 'GENERATED' ? 'badge-teal' : 'badge-amber'}`} style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                          <span className="badge-dot" style={{ backgroundColor: po.status === 'GENERATED' ? 'var(--teal)' : 'var(--amber)' }} />
                          {po.status === 'GENERATED' ? t('approved_not_sent') : t('pending_review')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          • {new Date(po.createdAt).toLocaleDateString()} {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <strong>{t(po.vendor?.displayName || 'Wholesaler Supplier', undefined, po.vendor?.displayName)}</strong> at {t(po.location?.name || 'Store Location', undefined, po.location?.name)}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/admin/reports/po/${po.id}`}
                      className={`btn btn-sm ${po.status === 'GENERATED' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textDecoration: 'none' }}
                    >
                      {po.status === 'GENERATED' ? t('send_po') : t('review_values')}
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
                  <h3>{t('no_pending_reviews')}</h3>
                  <p>{t('all_counts_approved')}</p>
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
                {t('po_and_stock_title')}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                {t('access_all_completed')}
              </p>
            </div>
            <Link href="/dashboard/admin/reports" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', textAlign: 'center', textDecoration: 'none', justifyContent: 'center' }}>
              {t('view_po_and_stock')}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
