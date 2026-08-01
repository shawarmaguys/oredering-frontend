'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../../../utils/api';
import AdminGuard from '../../../../components/AdminGuard';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface StockRecordItem {
  id: string;
  itemId: string;
  basicQuantity: number;
  secondaryQuantity: number;
  frontBasicQuantity: number;
  frontSecondaryQuantity: number;
  item?: {
    displayName: string;
    baseUnitName: string;
    displayUnitName: string;
    category?: { name: string };
  };
}

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy: string;
  submittedAt: string;
  isCompleted: boolean;
  slackMessageTs?: string;
  responseSlackMessageTs?: string;
  items: StockRecordItem[];
}

export default function StockRecordDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<StockRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.stockRecords
      .get(id)
      .then((res) => {
        setRecord(res);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load stock record details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px', margin: '0 auto' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/dashboard/admin/reports">Purchase Orders and Stock records</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Stock Take Record</span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton" style={{ height: '32px', width: '30%' }} />
            <div className="skeleton" style={{ height: '16px', width: '100%' }} />
            <div className="skeleton" style={{ height: '16px', width: '80%' }} />
          </div>
        ) : error && !record ? (
          <div className="card" style={{ padding: '24px', border: '1px solid var(--red-border)', backgroundColor: 'var(--red-subtle)', color: 'var(--red)' }}>
            ⚠️ {error}
          </div>
        ) : record ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderTop: '3px solid var(--accent)' }}>
              <div>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>RECORD ID: {record.id}</span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 8px 0' }}>
                  {record.location?.name || 'Store Location'} Stock Take
                </h1>

                <div style={{ display: 'flex', gap: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Submitted By: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{record.submittedBy || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Submitted At: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(record.submittedAt).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Status</span>
                <span className={`badge ${record.isCompleted ? 'badge-success' : 'badge-amber'}`} style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                  <span className="badge-dot" />
                  {record.isCompleted ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>

            {/* Items Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                Stock Items Count ({record.items?.length || 0})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="max-h-[500px] overflow-y-auto pr-1">
                {record.items?.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>
                    No item entries in this record.
                  </p>
                ) : (
                  record.items.map((item) => {
                    const itemName = item.item?.displayName || 'Unknown Item';
                    const baseUnit = item.item?.baseUnitName || '';
                    const displayUnit = item.item?.displayUnitName || '';

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
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                            {itemName}
                          </strong>
                          {item.item?.category?.name && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              Category: {item.item.category.name}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px 16px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Front Basic</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.frontBasicQuantity} {baseUnit}</strong>
                          </div>
                          {displayUnit && (
                            <div>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Front Secondary</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{item.frontSecondaryQuantity} {displayUnit}</strong>
                            </div>
                          )}
                          <div>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Main Basic</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.basicQuantity} {baseUnit}</strong>
                          </div>
                          {displayUnit && (
                            <div>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', display: 'block' }}>Main Secondary</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{item.secondaryQuantity} {displayUnit}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminGuard>
  );
}
