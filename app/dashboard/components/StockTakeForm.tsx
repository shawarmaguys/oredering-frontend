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

type Step = 'boh' | 'foh' | 'review';

const SUBMITTER_NAME_STORAGE_KEY = 'shawarmaguys_stock_submitter_name';

export default function StockTakeForm({ recordId, onClose, onSuccess }: StockTakeFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [step, setStep] = useState<Step>('boh');
  const [showSubmitterModal, setShowSubmitterModal] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterNameError, setSubmitterNameError] = useState('');

  useEffect(() => {
    if (recordId) {
      loadRecordDetails();
    }
  }, [recordId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setSubmitterName(localStorage.getItem(SUBMITTER_NAME_STORAGE_KEY) || '');
    } catch {
      setSubmitterName('');
    }
  }, []);

  const loadRecordDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const detailedRecord = await api.stockRecords.get(recordId);
      setLocationName(detailedRecord.location?.name || 'Store Location');
      setVendorName(detailedRecord.vendor?.displayName || detailedRecord.vendor?.name || '');
      setIsCompleted(detailedRecord.isCompleted || false);

      const initialItems = (detailedRecord.items || []).map((ri: any) => {
        const baseUnit = ri.item?.baseUnitName || 'pcs';
        const displayUnit = ri.item?.displayUnitName || baseUnit;
        const multiplier = Number(ri.item?.multiplier) || 1;
        const isSameUnit = baseUnit.toLowerCase() === displayUnit.toLowerCase() || multiplier === 1;

        return {
          itemId: ri.itemId,
          displayName: ri.item?.displayName || 'Unknown Item',
          baseUnitName: baseUnit,
          displayUnitName: displayUnit,
          multiplier,
          isSameUnit,
          backSecondaryInput: Number(ri.secondaryQuantity) || 0,
          backBaseInput: Number(ri.basicQuantity) || 0,
          frontSecondaryInput: Number(ri.frontSecondaryQuantity) || 0,
          frontBaseInput: Number(ri.frontBasicQuantity) || 0,
        };
      });
      setFormItems(initialItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock record details.');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemId: string, field: keyof FormItem, val: string) => {
    const numVal = parseFloat(val);
    setFormItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, [field]: isNaN(numVal) ? 0 : numVal } : item
      )
    );
  };

  const handleSubmit = async () => {
    const trimmedSubmitterName = submitterName.trim();
    if (!trimmedSubmitterName) {
      setSubmitterNameError('Enter your name to submit.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSubmitterNameError('');
    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SUBMITTER_NAME_STORAGE_KEY, trimmedSubmitterName);
        } catch {
          // Local persistence is best-effort; the submitted PDF still gets the entered name.
        }
      }

      const payloadItems = formItems.map(item => ({
        itemId: item.itemId,
        basicQuantity: item.backBaseInput,
        secondaryQuantity: item.backSecondaryInput,
        frontBasicQuantity: item.frontBaseInput,
        frontSecondaryQuantity: item.frontSecondaryInput,
      }));

      await api.stockRecords.complete(recordId, {
        items: payloadItems,
        submitterName: trimmedSubmitterName,
      });
      setSuccess(true);
      setShowSubmitterModal(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit stock recording.');
      setShowSubmitterModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = () => {
    setSubmitterNameError('');
    setShowSubmitterModal(true);
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card animate-fade-up" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: '200px', height: '24px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ width: '100%', height: '120px', borderRadius: '8px' }} />
      </div>
    );
  }

  // ─── Thank You Screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="card animate-fade-up" style={{ padding: '56px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', position: 'relative', zIndex: 1 }}>
          {/* Animated checkmark */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            backgroundColor: 'var(--success-subtle)',
            border: '2px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--success)',
            animation: 'pulse 2s infinite'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 40, height: 40 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Thank You!
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
              Your stock count for <strong style={{ color: 'var(--text-primary)' }}>{locationName}</strong> has been submitted successfully.
            </p>
            {vendorName && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Vendor: <strong>{vendorName}</strong>
              </p>
            )}
          </div>

          <div style={{
            padding: '16px 24px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', gap: '12px',
            maxWidth: '380px', width: '100%'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20, color: 'var(--success)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p style={{ fontSize: '0.8125rem', color: 'var(--success)', margin: 0, lineHeight: 1.5, textAlign: 'left' }}>
              The operations team has been notified. You may now close this window.
            </p>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-quaternary)', margin: 0 }}>
            Submitted at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    );
  }

  // ─── Step indicator helper ────────────────────────────────────────────────────
  const steps = [
    { id: 'boh', label: 'Back of House', short: 'BOH', color: '#d97706' },
    { id: 'foh', label: 'Front of House', short: 'FOH', color: '#10b981' },
  ];
  const currentStepIdx = steps.findIndex(s => s.id === step);

  // ─── Item input card ──────────────────────────────────────────────────────────
  const renderItemCard = (item: FormItem, zone: 'boh' | 'foh') => {
    const isBoh = zone === 'boh';
    const secField: keyof FormItem = isBoh ? 'backSecondaryInput' : 'frontSecondaryInput';
    const baseField: keyof FormItem = isBoh ? 'backBaseInput' : 'frontBaseInput';
    const accentColor = isBoh ? '#d97706' : '#10b981';
    const bgColor = isBoh ? 'rgba(217,119,6,0.03)' : 'rgba(16,185,129,0.03)';
    const borderColor = isBoh ? 'rgba(217,119,6,0.15)' : 'rgba(16,185,129,0.15)';

    return (
      <div key={item.itemId} style={{
        backgroundColor: 'var(--bg-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Item name header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {item.displayName}
          </span>
        </div>

        {/* Input area */}
        <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, margin: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          {item.isSameUnit ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '180px' }}>
              <input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={(item[secField] as number) || ''}
                onChange={e => updateItem(item.itemId, secField, e.target.value)}
                className="input"
                placeholder="0"
                style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.125rem', color: accentColor }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.displayUnitName}
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={(item[secField] as number) || ''}
                  onChange={e => updateItem(item.itemId, secField, e.target.value)}
                  className="input"
                  placeholder="0"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.125rem', color: accentColor }}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {item.displayUnitName}
                </span>
              </div>
              <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '1.25rem', paddingBottom: '20px' }}>+</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={(item[baseField] as number) || ''}
                  onChange={e => updateItem(item.itemId, baseField, e.target.value)}
                  className="input"
                  placeholder="0"
                  style={{ textAlign: 'center', fontWeight: 700, fontSize: '1.125rem', color: accentColor }}
                />
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  {item.baseUnitName}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Main form ────────────────────────────────────────────────────────────────
  return (
    <div className="card animate-fade-up" style={{ position: 'relative', overflow: 'hidden', padding: '24px' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
        }
        @media (max-width: 480px) {
          .stock-form-pad { padding: 16px !important; }
          .stock-step-label { display: none !important; }
        }
      `}</style>

      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '200px', height: '200px',
        background: step === 'boh' ? 'rgba(217,119,6,0.06)' : 'rgba(16,185,129,0.06)',
        borderRadius: '50%', filter: 'blur(60px)',
        marginRight: '-50px', marginTop: '-50px', pointerEvents: 'none',
        transition: 'background 0.4s ease'
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div>
          <span className="badge badge-indigo" style={{ marginBottom: '8px', display: 'inline-block' }}>
            Stock Count Audit
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {locationName}
          </h1>
          {vendorName && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: 0 }}>
              Vendor: <strong>{vendorName}</strong>
            </p>
          )}
        </div>

        {/* Already completed alert */}
        {isCompleted && (
          <div className="alert" style={{ backgroundColor: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)', fontSize: '0.8125rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            This audit was already submitted. Submitting again will update the recorded quantities.
          </div>
        )}

        {/* Combined step tab selector */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
          {steps.map((s) => {
            const isActive = s.id === step;
            const color = s.color;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as Step)}
                style={{
                  flex: isActive ? 2 : 1,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
                  backgroundColor: isActive
                    ? (s.id === 'boh' ? 'rgba(217,119,6,0.08)' : 'rgba(16,185,129,0.08)')
                    : 'var(--bg-sunken)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.25s ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: isActive ? color : 'var(--border-default)',
                  transition: 'background 0.2s ease',
                }} />
                <span style={{
                  fontSize: isActive ? '0.875rem' : '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? color : 'var(--text-tertiary)',
                  transition: 'all 0.2s ease',
                }}>
                  {isActive ? s.label : s.short}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '45vh', overflowY: 'auto', paddingRight: '2px' }}>
          {formItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
              No items assigned to this location.
            </div>
          ) : (
            formItems.map(item => renderItemCard(item, step as 'boh' | 'foh'))
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
          {step === 'boh' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('foh')}
                disabled={formItems.length === 0}
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center', gap: '8px', backgroundColor: '#d97706', borderColor: '#d97706' }}
              >
                Next: Front of House
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('boh')}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', gap: '8px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting || formItems.length === 0}
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {submitting ? 'Submitting...' : 'Submit Stock Count'}
              </button>
            </>
          )}
        </div>
      </div>

      {showSubmitterModal && (
        <div className="modal-backdrop">
          <div className="modal-panel modal-panel-sm" style={{ maxWidth: '380px' }}>
            <button
              type="button"
              onClick={() => setShowSubmitterModal(false)}
              className="modal-close"
              aria-label="Close modal"
              disabled={submitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-header">
              <h2>Submit Stock Count</h2>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label className="label" htmlFor="stock-submitter-name">Submitted By *</label>
                <input
                  id="stock-submitter-name"
                  type="text"
                  required
                  value={submitterName}
                  onChange={(e) => {
                    setSubmitterName(e.target.value);
                    setSubmitterNameError('');
                  }}
                  className="input"
                  autoFocus
                  maxLength={120}
                />
              </div>

              {submitterNameError && (
                <div className="alert alert-error">
                  {submitterNameError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitterModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
