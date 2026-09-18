'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  vendorName?: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  backSecondaryInput: number;
  backBaseInput: number;
  frontSecondaryInput: number;
  frontBaseInput: number;
  productType?: { id: string; name: string; color?: string | null } | null;
}

const SUBMITTER_NAME_STORAGE_KEY = 'shawarmaguys_stock_submitter_name';

export default function StockTakeForm({ recordId, onClose, onSuccess }: StockTakeFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [bohEnabled, setBohEnabled] = useState(true);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [touchedItems, setTouchedItems] = useState<Set<string>>(new Set());

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Submitter & Confirmation State
  const [showSubmitterModal, setShowSubmitterModal] = useState(false);
  const [showUncountedConfirm, setShowUncountedConfirm] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterNameError, setSubmitterNameError] = useState('');

  const { language, t } = useLanguage();
  const { refreshAll } = useReports();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (recordId) {
      loadRecordDetails();
    }
  }, [recordId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SUBMITTER_NAME_STORAGE_KEY);
      if (stored) setSubmitterName(stored);
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
      const recVendorName =
        detailedRecord.vendor?.displayName ||
        detailedRecord.vendor?.name ||
        detailedRecord.purchaseOrders?.[0]?.vendor?.displayName ||
        detailedRecord.items?.[0]?.item?.vendor?.displayName ||
        '';
      setVendorName(recVendorName);
      setIsCompleted(detailedRecord.isCompleted || false);
      const isBoh = detailedRecord.location?.bohEnabled !== false;
      setBohEnabled(isBoh);

      const initiallyTouched = new Set<string>();
      const initialItems = (detailedRecord.items || []).map((ri: any) => {
        const baseUnit = ri.item?.baseUnitName;
        const displayUnit = ri.item?.displayUnitName;
        const multiplier = Number(ri.item?.multiplier) || 1;
        const backSecondary = Number(ri.secondaryQuantity) || 0;
        const backBase = Number(ri.basicQuantity) || 0;
        const frontSecondary = Number(ri.frontSecondaryQuantity) || 0;
        const frontBase = Number(ri.frontBasicQuantity) || 0;
        const itemVendor = ri.item?.vendor?.displayName || ri.item?.vendor?.name || recVendorName;

        if (detailedRecord.isCompleted || backSecondary > 0 || backBase > 0 || frontSecondary > 0 || frontBase > 0) {
          initiallyTouched.add(ri.itemId);
        }

        return {
          itemId: ri.itemId,
          displayName: ri.item?.displayName || 'Unknown Item',
          spanishName: ri.item?.spanishName,
          note: ri.item?.note,
          vendorName: itemVendor,
          baseUnitName: baseUnit,
          displayUnitName: displayUnit,
          multiplier,
          backSecondaryInput: backSecondary,
          backBaseInput: backBase,
          frontSecondaryInput: frontSecondary,
          frontBaseInput: frontBase,
          productType: ri.item?.productType || null,
        };
      });

      setTouchedItems(initiallyTouched);
      setFormItems(initialItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock record details.');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemId: string, field: keyof FormItem, val: string | number) => {
    const numVal = typeof val === 'number' ? val : Number.parseFloat(val);
    const sanitized = Number.isNaN(numVal) ? 0 : Math.max(0, numVal);

    setTouchedItems(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    setFormItems(prev =>
      prev.map(item =>
        item.itemId === itemId ? { ...item, [field]: sanitized } : item
      )
    );
  };

  const adjustQuantity = (itemId: string, field: keyof FormItem, delta: number) => {
    setTouchedItems(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    setFormItems(prev =>
      prev.map(item => {
        if (item.itemId !== itemId) return item;
        const current = (item[field] as number) || 0;
        const nextVal = Math.max(0, Math.round((current + delta) * 100) / 100);
        return { ...item, [field]: nextVal };
      })
    );
  };

  // Helper to determine if an item has been counted
  const isItemCounted = (item: FormItem) => {
    if (touchedItems.has(item.itemId)) return true;
    return (
      item.backBaseInput > 0 ||
      item.backSecondaryInput > 0 ||
      item.frontBaseInput > 0 ||
      item.frontSecondaryInput > 0
    );
  };

  // Progress metrics
  const totalCount = formItems.length;
  const countedCount = useMemo(() => {
    return formItems.filter(isItemCounted).length;
  }, [formItems, touchedItems]);

  const uncountedCount = totalCount - countedCount;
  const progressPercent = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0;

  // Filtered items computation
  const filteredItems = useMemo(() => {
    return formItems.filter(item => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.displayName?.toLowerCase().includes(query);
        const matchesSpanish = item.spanishName?.toLowerCase().includes(query);
        const matchesNote = item.note?.toLowerCase().includes(query);
        const matchesCat = item.productType?.name?.toLowerCase().includes(query);
        if (!matchesName && !matchesSpanish && !matchesNote && !matchesCat) {
          return false;
        }
      }

      // 2. Category / Uncounted tab filter
      if (selectedCategoryFilter === 'all') return true;
      if (selectedCategoryFilter === 'uncounted') return !isItemCounted(item);
      if (selectedCategoryFilter === 'none') return !item.productType;
      return item.productType?.id === selectedCategoryFilter;
    });
  }, [formItems, searchQuery, selectedCategoryFilter, touchedItems]);

  // Categories list
  const availableCategories = useMemo(() => {
    return Array.from(
      new Map(
        formItems
          .map(i => i.productType)
          .filter((pt): pt is { id: string; name: string; color?: string | null } => Boolean(pt))
          .map(pt => [pt.id, pt])
      ).values()
    );
  }, [formItems]);

  const hasUncategorized = useMemo(() => {
    return formItems.some(i => !i.productType);
  }, [formItems]);

  // Submit Handler
  const executeSubmission = async (nameToUse: string) => {
    const trimmedName = nameToUse.trim();
    if (!trimmedName) {
      setSubmitterNameError(t('enter_name_error'));
      setShowSubmitterModal(true);
      return;
    }

    setSubmitting(true);
    setError('');
    setSubmitterNameError('');
    setShowUncountedConfirm(false);
    setShowSubmitterModal(false);

    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SUBMITTER_NAME_STORAGE_KEY, trimmedName);
        } catch {}
      }

      const payloadItems = formItems.map(item => ({
        itemId: item.itemId,
        basicQuantity: bohEnabled ? item.backBaseInput : 0,
        secondaryQuantity: bohEnabled ? item.backSecondaryInput : 0,
        frontBasicQuantity: item.frontBaseInput,
        frontSecondaryQuantity: item.frontSecondaryInput,
      }));

      await api.stockRecords.complete(recordId, {
        items: payloadItems,
        submitterName: trimmedName,
      });

      refreshAll().catch(() => {});
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit stock recording.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitialSubmitClick = () => {
    const trimmed = submitterName.trim();
    if (!trimmed) {
      setShowSubmitterModal(true);
      return;
    }

    // If there are uncounted items and this is not a re-submission, prompt confirmation
    if (uncountedCount > 0 && !isCompleted) {
      setShowUncountedConfirm(true);
      return;
    }

    executeSubmission(trimmed);
  };

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card animate-fade-up" style={{ padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: '180px', height: '24px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px' }} />
      </div>
    );
  }

  // ─── Thank You Screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="card animate-fade-up" style={{ padding: '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '76px', height: '76px', borderRadius: '50%',
            backgroundColor: 'var(--success-subtle)',
            border: '2px solid rgba(16,185,129,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--success)',
            animation: 'pulse 2s infinite'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 42, height: 42 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {t('thank_you')}
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
              {t('stock_submitted_success', { location: t(locationName, undefined, locationName) })}
            </p>
            {vendorName && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>
                {t('vendor_label')}: <strong>{t(vendorName, undefined, vendorName)}</strong>
              </p>
            )}
          </div>

          <div style={{
            padding: '14px 20px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: '12px',
            maxWidth: '360px', width: '100%'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20, color: 'var(--success)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: '0.8125rem', color: 'var(--success)', margin: 0, lineHeight: 1.4, textAlign: 'left', fontWeight: 500 }}>
              {t('close_window_notice')}
            </p>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-quaternary)', margin: 0 }}>
            {t('submitted_at', { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
          </p>
        </div>
      </div>
    );
  }

  // ─── Compact Stepper Row Component ──────────────────────────────────────────
  const StepperInput = ({
    value,
    unitName,
    onChange,
    onAdjust,
    accentColor,
  }: {
    value: number;
    unitName: string;
    onChange: (val: string) => void;
    onAdjust: (delta: number) => void;
    accentColor: string;
  }) => {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
      }}>
        {/* Decrement Button */}
        <button
          type="button"
          onClick={() => onAdjust(-1)}
          aria-label="Decrease quantity"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            flexShrink: 0,
            userSelect: 'none',
            touchAction: 'manipulation',
            transition: 'background 0.15s ease, transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          -
        </button>

        {/* Numeric Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <input
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={value || ''}
            placeholder="0"
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{
              width: '100%',
              height: '38px',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '1.05rem',
              color: accentColor,
              backgroundColor: 'var(--bg-surface)',
              border: `1.5px solid ${value > 0 ? accentColor : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              outline: 'none',
              boxShadow: value > 0 ? `0 0 0 1px ${accentColor}30` : 'none',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
            }}
          />
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={() => onAdjust(1)}
          aria-label="Increase quantity"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.25rem',
            fontWeight: 700,
            flexShrink: 0,
            userSelect: 'none',
            touchAction: 'manipulation',
            transition: 'background 0.15s ease, transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          +
        </button>

        {/* Unit Label */}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          width: '52px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {t(unitName, undefined, unitName)}
        </span>
      </div>
    );
  };

  // ─── Compact Item Card Component ────────────────────────────────────────────
  const renderItemCard = (item: FormItem) => {
    const isCounted = isItemCounted(item);

    return (
      <div
        key={item.itemId}
        style={{
          backgroundColor: isCounted ? 'var(--bg-surface)' : 'var(--bg-sunken)',
          border: `1.5px solid ${isCounted ? 'rgba(16,185,129,0.35)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: isCounted ? '0 2px 8px rgba(16,185,129,0.06)' : 'none',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          transition: 'border 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Item Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {(language === 'es' && item.spanishName) ? item.spanishName : t(item.displayName, undefined, item.displayName)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {item.vendorName && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  🏢 {item.vendorName}
                </span>
              )}
              {item.note && item.note.trim() !== '' && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.3 }}>
                  {t(item.note, undefined, item.note)}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {item.productType && (
              <span
                className="badge"
                style={{
                  backgroundColor: item.productType.color ? `${item.productType.color}18` : 'var(--bg-tertiary)',
                  color: item.productType.color || 'var(--text-secondary)',
                  borderColor: item.productType.color || 'var(--border-default)',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                }}
              >
                {item.productType.name}
              </span>
            )}
            {isCounted ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.3)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
              }}>
                ✓ {t('counted_status')}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.68rem',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
              }}>
                {t('uncounted_status')}
              </span>
            )}
          </div>
        </div>

        {/* Inputs Layout: 2 Columns on Desktop/Tablet, Responsive Stacking on Small Mobile */}
        <div
          className="stock-columns-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: bohEnabled ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr',
            gap: '8px',
          }}
        >
          {/* Back of House (BOH) Column */}
          {bohEnabled && (
            <div style={{
              backgroundColor: 'rgba(217,119,6,0.03)',
              border: '1px solid rgba(217,119,6,0.18)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#d97706' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                <span>{t('boh')} ({t('boh_short')})</span>
              </div>

              {item.displayUnitName && (
                <StepperInput
                  value={item.backSecondaryInput}
                  unitName={item.displayUnitName}
                  accentColor="#d97706"
                  onChange={(val) => updateItem(item.itemId, 'backSecondaryInput', val)}
                  onAdjust={(delta) => adjustQuantity(item.itemId, 'backSecondaryInput', delta)}
                />
              )}

              <StepperInput
                value={item.backBaseInput}
                unitName={item.baseUnitName}
                accentColor="#d97706"
                onChange={(val) => updateItem(item.itemId, 'backBaseInput', val)}
                onAdjust={(delta) => adjustQuantity(item.itemId, 'backBaseInput', delta)}
              />
            </div>
          )}

          {/* Front of House (FOH) Column */}
          <div style={{
            backgroundColor: 'rgba(16,185,129,0.03)',
            border: '1px solid rgba(16,185,129,0.18)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>{t('foh')} ({t('foh_short')})</span>
            </div>

            {item.displayUnitName && (
              <StepperInput
                value={item.frontSecondaryInput}
                unitName={item.displayUnitName}
                accentColor="#10b981"
                onChange={(val) => updateItem(item.itemId, 'frontSecondaryInput', val)}
                onAdjust={(delta) => adjustQuantity(item.itemId, 'frontSecondaryInput', delta)}
              />
            )}

            <StepperInput
              value={item.frontBaseInput}
              unitName={item.baseUnitName}
              accentColor="#10b981"
              onChange={(val) => updateItem(item.itemId, 'frontBaseInput', val)}
              onAdjust={(delta) => adjustQuantity(item.itemId, 'frontBaseInput', delta)}
            />
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="card animate-fade-up stock-form-wrapper"
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 14px 0 14px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(16,185,129,0); }
        }
        /* Remove default browser spinners on inputs */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        @media (max-width: 640px) {
          .stock-form-wrapper { padding: 10px 10px 0 10px !important; }
          .stock-columns-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Decorative Glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, rgba(217,119,6,0.05) 50%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(50px)',
        marginRight: '-40px', marginTop: '-40px', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ─── Fixed Top Header & Quick Filters ─────────────────────────────── */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                  {t('stock_count_audit')}
                </span>
                {vendorName && (
                  <span
                    className="badge badge-teal"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🏢 {vendorName}
                  </span>
                )}
                {bohEnabled ? (
                  <span className="badge" style={{ backgroundColor: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)', fontSize: '0.68rem', padding: '2px 8px' }}>
                    BOH + FOH
                  </span>
                ) : (
                  <span className="badge" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.68rem', padding: '2px 8px' }}>
                    FOH Only
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{t(locationName, undefined, locationName)}</span>
                {vendorName && (
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    • {vendorName}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Already Completed Notice */}
          {isCompleted && (
            <div className="alert" style={{ backgroundColor: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)', fontSize: '0.75rem', padding: '6px 10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {t('audit_already_submitted')}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              ref={searchInputRef}
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_items_placeholder')}
              style={{
                paddingLeft: '34px',
                paddingRight: searchQuery ? '32px' : '12px',
                fontSize: '0.85rem',
                height: '36px',
                borderRadius: 'var(--radius-md)',
              }}
            />
            <span style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
              fontSize: '0.9rem',
            }}>
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Chips (All / Uncounted / Categories) */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {/* All Filter */}
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`badge ${selectedCategoryFilter === 'all' ? 'badge-indigo' : 'badge-neutral'}`}
              style={{
                cursor: 'pointer',
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              All ({formItems.length})
            </button>

            {/* Uncounted Filter Chip */}
            {uncountedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('uncounted')}
                style={{
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (selectedCategoryFilter === 'uncounted' ? '#f59e0b' : 'var(--border-subtle)'),
                  backgroundColor: selectedCategoryFilter === 'uncounted' ? 'rgba(245,158,11,0.18)' : 'var(--bg-sunken)',
                  color: selectedCategoryFilter === 'uncounted' ? '#d97706' : 'var(--text-secondary)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                {t('uncounted_filter')} ({uncountedCount})
              </button>
            )}

            {/* Category Chips */}
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
                    padding: '5px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor: isSelected ? (cat.color || 'var(--accent)') : 'var(--bg-tertiary)',
                    color: isSelected ? '#fff' : (cat.color || 'var(--text-secondary)'),
                    borderColor: cat.color || 'var(--border-default)',
                    flexShrink: 0,
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
                style={{ cursor: 'pointer', padding: '5px 10px', fontSize: '0.72rem', flexShrink: 0 }}
              >
                Uncategorized ({formItems.filter(i => !i.productType).length})
              </button>
            )}
          </div>
        </div>

        {/* ─── Items Stream (Dedicated Vertical Scroll Container) ───────────── */}
        <div
          id="stock-take-items-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px',
            paddingBottom: '16px',
          }}
        >
          {formItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)' }}>
              {t('no_items_assigned')}
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              backgroundColor: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🔍</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                No items match your filter
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('all');
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '4px' }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredItems.map(renderItemCard)
          )}
        </div>

        {/* ─── Docked Bottom Action Bar (outside scroll, always visible) ───── */}
        <div style={{
          flexShrink: 0,
          backgroundColor: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border-default)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
          padding: '10px 14px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          margin: '0 -14px',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {/* Submitter Quick Pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>👤 {t('counting_as')}:</span>
              <strong style={{
                color: submitterName.trim() ? 'var(--text-primary)' : '#d97706',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {submitterName.trim() || t('enter_name_error')}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setShowSubmitterModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.75rem',
                padding: '2px 6px',
              }}
            >
              [{t('change_submitter')}]
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                flex: 1,
                justifyContent: 'center',
                height: '46px',
                fontSize: '0.9rem',
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleInitialSubmitClick}
              disabled={submitting || formItems.length === 0}
              className="btn btn-primary"
              style={{
                flex: 2,
                justifyContent: 'center',
                height: '46px',
                fontSize: '0.92rem',
                fontWeight: 700,
                backgroundColor: '#10b981',
                borderColor: '#10b981',
                boxShadow: '0 2px 10px rgba(16,185,129,0.25)',
              }}
            >
              {submitting
                ? t('submitting')
                : `${t('submit_stock_count')} (${countedCount}/${totalCount})`}
            </button>
          </div>
        </div>

      </div>

      {/* ─── Submitter Name Modal ──────────────────────────────────────────── */}
      {showSubmitterModal && (
        <div className="modal-backdrop">
          <div className="modal-panel modal-panel-sm" style={{ maxWidth: '380px', margin: '16px' }}>
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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Please enter your name for the kitchen audit record.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeSubmission(submitterName);
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
                  placeholder="e.g. Alex Martinez"
                />
              </div>

              {submitterNameError && (
                <div className="alert alert-error" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
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
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: '#10b981', borderColor: '#10b981' }}
                  disabled={submitting}
                >
                  {submitting ? t('submitting') : t('submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Uncounted Items Confirmation Modal ────────────────────────────── */}
      {showUncountedConfirm && (
        <div className="modal-backdrop">
          <div className="modal-panel modal-panel-sm" style={{ maxWidth: '400px', margin: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245,158,11,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              marginBottom: '12px',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 24, height: 24 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              {t('confirm_uncounted_title')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              {t('confirm_uncounted_desc', { count: uncountedCount })}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowUncountedConfirm(false);
                  setSelectedCategoryFilter('uncounted');
                  document.getElementById('stock-take-items-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn btn-primary"
                style={{ justifyContent: 'center', height: '42px', fontWeight: 600 }}
              >
                {t('review_uncounted_btn')} ({uncountedCount})
              </button>
              <button
                type="button"
                onClick={() => executeSubmission(submitterName)}
                className="btn btn-secondary"
                style={{ justifyContent: 'center', height: '42px' }}
                disabled={submitting}
              >
                {t('submit_anyway_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
