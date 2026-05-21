'use client';

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

interface StockTakeFormProps {
  recordId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormItem {
  itemId: string;
  displayName: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  isSameUnit: boolean;
  backSecondaryInput: number;
  backBaseInput: number;
  frontSecondaryInput: number;
  frontBaseInput: number;
}

export default function StockTakeForm({ recordId, onClose, onSuccess }: StockTakeFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [formItems, setFormItems] = useState<FormItem[]>([]);

  useEffect(() => {
    if (recordId) {
      loadRecordDetails();
    }
  }, [recordId]);

  const loadRecordDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const detailedRecord = await api.stockRecords.get(recordId);
      setLocationName(detailedRecord.location?.name || 'Store Location');
      setVendorName(detailedRecord.vendor?.displayName || detailedRecord.vendor?.name || '');
      setIsCompleted(detailedRecord.isCompleted || false);
      setCompletedAt(detailedRecord.submittedAt || null);

      const initialItems = (detailedRecord.items || []).map((ri: any) => {
        const baseUnit = ri.item?.baseUnitName || 'pcs';
        const displayUnit = ri.item?.displayUnitName || baseUnit;
        const multiplier = Number(ri.item?.multiplier) || 1;
        const isSameUnit = baseUnit.toLowerCase() === displayUnit.toLowerCase() || multiplier === 1;

        const backSec = Number(ri.secondaryQuantity) || 0;
        const backBase = Number(ri.basicQuantity) || 0;
        const frontSec = Number(ri.frontSecondaryQuantity) || 0;
        const frontBase = Number(ri.frontBasicQuantity) || 0;

        return {
          itemId: ri.itemId,
          displayName: ri.item?.displayName || 'Unknown Item',
          baseUnitName: baseUnit,
          displayUnitName: displayUnit,
          multiplier: multiplier,
          isSameUnit: isSameUnit,
          backSecondaryInput: backSec,
          backBaseInput: backBase,
          frontSecondaryInput: frontSec,
          frontBaseInput: frontBase
        };
      });
      setFormItems(initialItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock record details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackSecondaryChange = (itemId: string, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, backSecondaryInput: isNaN(numVal) ? 0 : numVal } : item
    ));
  };

  const handleBackBaseChange = (itemId: string, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, backBaseInput: isNaN(numVal) ? 0 : numVal } : item
    ));
  };

  const handleFrontSecondaryChange = (itemId: string, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, frontSecondaryInput: isNaN(numVal) ? 0 : numVal } : item
    ));
  };

  const handleFrontBaseChange = (itemId: string, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, frontBaseInput: isNaN(numVal) ? 0 : numVal } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payloadItems = formItems.map(item => {
        return {
          itemId: item.itemId,
          basicQuantity: item.backBaseInput,
          secondaryQuantity: item.backSecondaryInput,
          frontBasicQuantity: item.frontBaseInput,
          frontSecondaryQuantity: item.frontSecondaryInput
        };
      });

      await api.stockRecords.complete(recordId, {
        items: payloadItems
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit stock recording.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card animate-fade-up" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: '200px', height: '24px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '8px' }} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="card animate-fade-up" style={{ padding: '48px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative Green Glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: 'var(--success-subtle)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          marginRight: '-40px',
          marginTop: '-40px',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(16,185,129,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 32, height: 32 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Submission Successful!
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto' }}>
              The physical stock count for <strong>{locationName}</strong> has been saved and logged successfully. Thank you!
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ minWidth: '160px', justifyContent: 'center', marginTop: '8px' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-up" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Brand Glow */}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '8px' }}>
              Stock Count Audit
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {locationName}
            </h1>
            {vendorName && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: 0 }}>
                Vendor: <strong>{vendorName}</strong>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px' }}
            title="Cancel and close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isCompleted && (
          <div className="alert" style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            This stock audit was already submitted {completedAt ? `at ${new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}. Submitting again will update the recorded quantities.
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '60vh',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {formItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                No items are assigned to this location.
              </div>
            ) : (
              formItems.map((item) => (
                <div
                  key={item.itemId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    backgroundColor: 'var(--bg-sunken)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    gap: '16px'
                  }}
                >
                  <div style={{ width: '100%', paddingBottom: '12px', borderBottom: '1px dashed var(--border-subtle)' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.displayName}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', width: '100%' }}>
                    {/* BACK OF HOUSE (BOH) */}
                    <div style={{
                      backgroundColor: 'rgba(217, 119, 6, 0.03)',
                      border: '1px solid rgba(217, 119, 6, 0.12)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Back of House
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                        {item.isSameUnit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.backSecondaryInput || ''}
                              onChange={(e) => handleBackSecondaryChange(item.itemId, e.target.value)}
                              className="input"
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '0.95rem',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            />
                            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                              {item.displayUnitName}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.backSecondaryInput || ''}
                                onChange={(e) => handleBackSecondaryChange(item.itemId, e.target.value)}
                                className="input"
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.95rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                }}
                              />
                              <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {item.displayUnitName}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-quaternary)', fontWeight: 600, fontSize: '1rem' }}>+</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.backBaseInput || ''}
                                onChange={(e) => handleBackBaseChange(item.itemId, e.target.value)}
                                className="input"
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.95rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                }}
                              />
                              <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {item.baseUnitName}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* FRONT OF HOUSE (FOH) */}
                    <div style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.03)',
                      border: '1px solid rgba(16, 185, 129, 0.12)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Front of House
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                        {item.isSameUnit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.frontSecondaryInput || ''}
                              onChange={(e) => handleFrontSecondaryChange(item.itemId, e.target.value)}
                              className="input"
                              placeholder="0"
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                fontSize: '0.95rem',
                                textAlign: 'center',
                                fontWeight: 600,
                              }}
                            />
                            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                              {item.displayUnitName}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.frontSecondaryInput || ''}
                                onChange={(e) => handleFrontSecondaryChange(item.itemId, e.target.value)}
                                className="input"
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.95rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                }}
                              />
                              <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {item.displayUnitName}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-quaternary)', fontWeight: 600, fontSize: '1rem' }}>+</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.frontBaseInput || ''}
                                onChange={(e) => handleFrontBaseChange(item.itemId, e.target.value)}
                                className="input"
                                placeholder="0"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.95rem',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                }}
                              />
                              <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                {item.baseUnitName}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || formItems.length === 0}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {submitting ? 'Submitting Counts...' : 'Submit Physical Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
