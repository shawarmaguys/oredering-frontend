'use client';

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

interface StockRecordItem {
  id: string;
  itemId: string;
  item?: {
    id: string;
    displayName: string;
    baseUnitName: string;
  };
  enteredQuantity: number;
  enteredUnit: string;
}

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy?: string;
  submittedByUser?: {
    fullName: string;
  };
  submittedAt: string;
  isCompleted: boolean;
  items?: StockRecordItem[];
}

export default function WorkerDashboard() {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active submission states
  const [activeRecord, setActiveRecord] = useState<StockRecord | null>(null);
  const [formItems, setFormItems] = useState<{ itemId: string; enteredQuantity: number; enteredUnit: string; displayName: string }[]>([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.stockRecords.list();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock records.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSubmission = async (recordId: string) => {
    setError('');
    try {
      const detailedRecord = await api.stockRecords.get(recordId);
      setActiveRecord(detailedRecord);
      
      // Initialize form items from the stock record's items (which are seeded with 0 by trigger)
      const initialItems = (detailedRecord.items || []).map((ri: any) => ({
        itemId: ri.itemId,
        enteredQuantity: Number(ri.enteredQuantity) || 0,
        enteredUnit: ri.enteredUnit || ri.item?.baseUnitName || 'pcs',
        displayName: ri.item?.displayName || 'Unknown Item'
      }));
      setFormItems(initialItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock record details.');
    }
  };

  const handleQuantityChange = (itemId: string, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, enteredQuantity: isNaN(numVal) ? 0 : numVal } : item
    ));
  };

  const handleUnitChange = (itemId: string, unit: string) => {
    setFormItems(prev => prev.map(item => 
      item.itemId === itemId ? { ...item, enteredUnit: unit } : item
    ));
  };

  const handleSubmitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    setSubmitting(true);
    setError('');

    try {
      await api.stockRecords.complete(activeRecord.id, {
        items: formItems.map(item => ({
          itemId: item.itemId,
          enteredQuantity: item.enteredQuantity,
          enteredUnit: item.enteredUnit
        }))
      });

      setActiveRecord(null);
      setFormItems([]);
      fetchRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to complete stock recording.');
    } finally {
      setSubmitting(false);
    }
  };

  const drafts = records.filter(r => !r.isCompleted);
  const completed = records.filter(r => r.isCompleted);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Store Portal</h1>
          <p>Record kitchen stock audits, view schedules, and submit daily physical quantities.</p>
        </div>
      </div>

      {error && !activeRecord && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      <div className="card animate-fade-up" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'var(--accent-subtle)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          marginRight: '-50px',
          marginTop: '-50px',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: drafts.length > 0 ? 'var(--warning-subtle)' : 'var(--accent-subtle)',
              border: drafts.length > 0 ? '1px solid rgba(217,119,6,0.2)' : '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: drafts.length > 0 ? 'var(--warning)' : 'var(--accent)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {drafts.length > 0 ? 'Action Required' : 'All Caught Up!'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {drafts.length > 0 
                  ? `You have ${drafts.length} pending inventory count(s) to complete today.` 
                  : 'No scheduled inventory counts are currently pending.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Loading Skeleton */}
            {loading ? (
              <div className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-xl)' }} />
            ) : (
              <>
                {/* Active Drafts */}
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      backgroundColor: 'var(--bg-sunken)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Pending Stock Audit: {draft.location?.name || 'Store Location'}
                      </h3>
                      <span className="badge badge-amber" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                        <span className="badge-dot" />
                        Awaiting Count
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartSubmission(draft.id)}
                      className="btn btn-primary"
                    >
                      Start submission
                    </button>
                  </div>
                ))}

                {/* Finished Audits */}
                {completed.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap',
                      opacity: 0.8
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Submitted Audit: {comp.location?.name || 'Store Location'}
                      </h3>
                      <span className="badge badge-green" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        Submitted at {new Date(comp.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Completed
                    </span>
                  </div>
                ))}

                {!loading && drafts.length === 0 && completed.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    No stock take history logged for today yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audit Form Modal */}
      {activeRecord && (
        <div className="modal-backdrop" style={{ zIndex: 100 }}>
          <div className="modal-panel modal-panel-md">
            <button
              onClick={() => setActiveRecord(null)}
              className="modal-close"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-header">
              <h2>Record Inventory Audit</h2>
              <p>Count and input current physical stocks for <strong>{activeRecord.location?.name || 'Store'}</strong>.</p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitComplete} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                maxHeight: '350px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                paddingRight: '6px'
              }}>
                {formItems.map((item) => (
                  <div
                    key={item.itemId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: 'var(--bg-sunken)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <strong style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {item.displayName}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={item.enteredQuantity || ''}
                        onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                        className="input"
                        placeholder="Quantity"
                        style={{ width: '90px', padding: '6px 10px', fontSize: '0.875rem', textAlign: 'right' }}
                      />
                      
                      <select
                        value={item.enteredUnit}
                        onChange={(e) => handleUnitChange(item.itemId, e.target.value)}
                        className="input"
                        style={{ width: '85px', padding: '6px 8px', fontSize: '0.8125rem' }}
                      >
                        <option value={item.enteredUnit}>{item.enteredUnit}</option>
                        {item.enteredUnit !== 'pcs' && <option value="pcs">pcs</option>}
                        {item.enteredUnit !== 'lbs' && item.enteredUnit !== 'kg' && item.enteredUnit !== 'pcs' && (
                          <option value="lbs">lbs</option>
                        )}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveRecord(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {submitting ? 'Submitting count...' : 'Submit Stock Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
