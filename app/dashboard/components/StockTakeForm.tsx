'use client';

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';

import { useReports } from '../../context/ReportsContext';

interface StockTakeFormProps {
  recordId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormItem {
  itemId: string;
  displayName: string;
  spanishName?: string;
  note?: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  backSecondaryInput: number;
  backBaseInput: number;
  frontSecondaryInput: number;
  frontBaseInput: number;
  productType?: { id: string; name: string; color?: string | null } | null;
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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [step, setStep] = useState<Step>('boh');
  const [showSubmitterModal, setShowSubmitterModal] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterNameError, setSubmitterNameError] = useState('');
  const { language, t } = useLanguage();
  const { refreshAll } = useReports();

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
        const baseUnit = ri.item?.baseUnitName;
        const displayUnit = ri.item?.displayUnitName;
        const multiplier = Number(ri.item?.multiplier) || 1;
        return {
          itemId: ri.itemId,
          displayName: ri.item?.displayName || 'Unknown Item',
          spanishName: ri.item?.spanishName,
          note: ri.item?.note,
          baseUnitName: baseUnit,
          displayUnitName: displayUnit,
          multiplier,
          backSecondaryInput: Number(ri.secondaryQuantity) || 0,
          backBaseInput: Number(ri.basicQuantity) || 0,
          frontSecondaryInput: Number(ri.frontSecondaryQuantity) || 0,
          frontBaseInput: Number(ri.frontBasicQuantity) || 0,
          productType: ri.item?.productType || null,
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
    const numVal = Number.parseFloat(val);
    setFormItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, [field]: Number.isNaN(numVal) ? 0 : numVal } : item
      )
    );
  };

  const handleSubmit = async () => {
    const trimmedSubmitterName = submitterName.trim();
    if (!trimmedSubmitterName) {
      setSubmitterNameError(t('enter_name_error'));
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
          // Local persistence is best-effort
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
      refreshAll().catch(() => {});
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
              {t('thank_you')}
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>
              {t('stock_submitted_success', { location: t(locationName, undefined, locationName) })}
            </p>
            {vendorName && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {t('vendor_label')}: <strong>{t(vendorName, undefined, vendorName)}</strong>
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
              {t('close_window_notice')}
            </p>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-quaternary)', margin: 0 }}>
            {t('submitted_at', { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
          </p>
        </div>
      </div>
    );
  }

  // ─── Step indicator helper ────────────────────────────────────────────────────
  const steps = [
    { id: 'boh', label: t('boh'), short: t('boh_short'), color: '#d97706' },
    { id: 'foh', label: t('foh'), short: t('foh_short'), color: '#10b981' },
  ];

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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {(language === 'es' && item.spanishName) ? item.spanishName : t(item.displayName, undefined, item.displayName)}
            </span>
            {item.note && item.note.trim() !== '' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400, lineHeight: 1.35 }}>
                {t(item.note, undefined, item.note)}
              </span>
            )}
          </div>
          {item.productType && (
            <span
              className="badge"
              style={{
                backgroundColor: item.productType.color ? `${item.productType.color}22` : 'var(--bg-tertiary)',
                color: item.productType.color || 'var(--text-secondary)',
                borderColor: item.productType.color || 'var(--border-default)',
                fontSize: '0.7rem',
                flexShrink: 0,
              }}
            >
              {item.productType.name}
            </span>
          )}
        </div>

        {/* Input area */}
        <div style={{ padding: '16px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, margin: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          {item.displayUnitName && (
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
                  {t(item.displayUnitName, undefined, item.displayUnitName)}
                </span>
              </div>
              <span style={{ color: 'var(--text-quaternary)', fontWeight: 700, fontSize: '1.25rem', paddingBottom: '20px' }}>+</span>
            </>
          )}

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
              {t(item.baseUnitName, undefined, item.baseUnitName)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ─── Main form ────────────────────────────────────────────────────────────────
  return (
    <div className="card animate-fade-up stock-form-pad" style={{ position: 'relative', overflow: 'hidden', padding: '24px' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
        }
        @media (max-width: 640px) {
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
            {t('stock_count_audit')}
          </span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {t(locationName, undefined, locationName)}
          </h1>
          {vendorName && (
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: 0 }}>
              {t('vendor_label')}: <strong>{t(vendorName, undefined, vendorName)}</strong>
            </p>
          )}
        </div>

        {/* Already completed alert */}
        {isCompleted && (
          <div className="alert" style={{ backgroundColor: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)', fontSize: '0.8125rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {t('audit_already_submitted')}
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

        {/* Category Pills Filter */}
        {(() => {
          const availableCategories = Array.from(
            new Map(
              formItems
                .map(i => i.productType)
                .filter((pt): pt is { id: string; name: string; color?: string | null } => Boolean(pt))
                .map(pt => [pt.id, pt])
            ).values()
          );
          const hasUncategorized = formItems.some(i => !i.productType);
          if (availableCategories.length === 0) return null;

          return (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`badge ${selectedCategoryFilter === 'all' ? 'badge-indigo' : 'badge-neutral'}`}
                style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem' }}
              >
                All ({formItems.length})
              </button>
              {availableCategories.map(cat => {
                const count = formItems.filter(i => i.productType?.id === cat.id).length;
                const isSelected = selectedCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className="badge"
                    style={{
                      cursor: 'pointer',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      backgroundColor: isSelected ? (cat.color || 'var(--accent)') : 'var(--bg-tertiary)',
                      color: isSelected ? '#fff' : (cat.color || 'var(--text-secondary)'),
                      borderColor: cat.color || 'var(--border-default)',
                    }}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
              {hasUncategorized && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('none')}
                  className={`badge ${selectedCategoryFilter === 'none' ? 'badge-indigo' : 'badge-neutral'}`}
                  style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  Uncategorized ({formItems.filter(i => !i.productType).length})
                </button>
              )}
            </div>
          );
        })()}

        {/* Items list */}
        <div className="flex-1 max-h-[400px] overflow-y-auto pr-1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '2px' }}>
            {formItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                {t('no_items_assigned')}
              </div>
            ) : (() => {
              const displayedFormItems = formItems.filter(item => {
                if (selectedCategoryFilter === 'all') return true;
                if (selectedCategoryFilter === 'none') return !item.productType;
                return item.productType?.id === selectedCategoryFilter;
              });

              if (displayedFormItems.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    No items in this category.
                  </div>
                );
              }

              return displayedFormItems.map(item => renderItemCard(item, step as 'boh' | 'foh'));
            })()}
          </div>
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
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => setStep('foh')}
                disabled={formItems.length === 0}
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center', gap: '8px', backgroundColor: '#d97706', borderColor: '#d97706' }}
              >
                {t('next_foh')}
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
                {t('back')}
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting || formItems.length === 0}
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {submitting ? t('submitting') : t('submit_stock_count')}
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
              aria-label={t('close')}
              disabled={submitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="modal-header">
              <h2>{t('submit_stock_count')}</h2>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label className="label" htmlFor="stock-submitter-name">{t('submitted_by_label')}</label>
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
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={submitting}
                >
                  {submitting ? t('submitting') : t('submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
