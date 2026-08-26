'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../utils/api';
import { Item, Vendor } from './types';
import { useProductTypes } from '../../../context/ProductTypesContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';

// ─── Shared translation button ────────────────────────────────────────────────
interface TranslateButtonProps {
  sourceText: string;
  onTranslated: (val: string) => void;
  onError: (msg: string) => void;
}

function TranslateButton({ sourceText, onTranslated, onError }: TranslateButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!sourceText.trim()) { onError('Enter a product name first.'); return; }
    setLoading(true);
    try {
      const res = await api.translations.translateText(sourceText);
      if (res?.translated) onTranslated(res.translated);
      else onError('Could not translate product name.');
    } catch (err: any) {
      onError(err.message || 'Translation service error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading || !sourceText.trim()} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.75rem' }}>
      {loading ? (
        <><span className="spinner-sm" style={{ width: 12, height: 12 }} />Translating...</>
      ) : (
        <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m0 2.25c0 3.255-1.554 6.13-3.954 7.95a12.062 12.062 0 01-2.906-2.18m8.96 4.908a12.062 12.062 0 01-3.15-2.025" /></svg>Autofill Spanish</>
      )}
    </button>
  );
}

// ─── Shared unit fields ───────────────────────────────────────────────────────
interface UnitFieldsProps {
  baseUnit: string; setBaseUnit: (v: string) => void;
  displayUnit: string; setDisplayUnit: (v: string) => void;
  multiplier: number | ''; setMultiplier: (v: number | '') => void;
  idPrefix: string;
}

function UnitFields({ baseUnit, setBaseUnit, displayUnit, setDisplayUnit, multiplier, setMultiplier, idPrefix }: UnitFieldsProps) {
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label className="label" htmlFor={`${idPrefix}-base`}>Individual Stock Unit *</label>
        <input id={`${idPrefix}-base`} type="text" required value={baseUnit} onChange={e => setBaseUnit(e.target.value)} className="input" placeholder="e.g. lbs, oz, each" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label className="label" htmlFor={`${idPrefix}-secondary`}>Pack Size</label>
          <input id={`${idPrefix}-secondary`} type="text" value={displayUnit} onChange={e => setDisplayUnit(e.target.value)} className="input" placeholder="e.g. case, box, cone" />
        </div>
        <div hidden={!displayUnit}>
          <label className="label" htmlFor={`${idPrefix}-multiplier`}>Multiplier *</label>
          <input id={`${idPrefix}-multiplier`} type="number" step="any" min="0.0001" disabled={!displayUnit} value={multiplier} onChange={e => setMultiplier(e.target.value === '' ? '' : Number(e.target.value))} className="input mono" placeholder="e.g. 30" />
        </div>
      </div>
      {displayUnit && <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '-8px' }}>Conversion: 1 {displayUnit} = {multiplier || 'X'} {baseUnit}</p>}
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
interface CreateItemModalProps {
  vendors: Vendor[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateItemModal({ vendors, onClose, onCreated }: CreateItemModalProps) {
  const { productTypes } = useProductTypes();
  const { selectedLocationId } = useLocationFilter();
  const [displayName, setDisplayName] = useState('');
  const [spanishName, setSpanishName] = useState('');
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '');
  const [productTypeId, setProductTypeId] = useState('');
  const [baseUnitName, setBaseUnitName] = useState('');
  const [displayUnitName, setDisplayUnitName] = useState('');
  const [multiplier, setMultiplier] = useState<number | ''>('');
  const [productCode, setProductCode] = useState('');
  const [note, setNote] = useState('');
  const [parLevel, setParLevel] = useState<number | ''>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { setError('Please select a vendor first.'); return; }
    const hasSecondary = displayUnitName.trim() !== '';
    if (hasSecondary && (multiplier === '' || Number(multiplier) <= 0)) {
      setError('Enter a valid multiplier for the pack size.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.items.create({
        displayName,
        spanishName: spanishName.trim() || undefined,
        vendorId,
        productTypeId: productTypeId || undefined,
        baseUnitName,
        displayUnitName: hasSecondary ? displayUnitName : undefined,
        multiplier: hasSecondary ? Number(multiplier) : 1,
        productCode: productCode || undefined,
        note: note || undefined,
        locationId: selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined,
        parLevel: parLevel !== '' ? Number(parLevel) : 0,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel modal-panel-md">
        <button type="button" onClick={onClose} className="modal-close" aria-label="Close modal">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="modal-header">
          <h2>Catalog New Product</h2>
          <p>Register product SKUs, baseline operational measurements, and procurement units.</p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {vendors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You must onboard at least one vendor before adding products.</p>
            <Link href="/dashboard/admin/vendors" className="btn btn-primary">Go Onboard Vendor</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="label" htmlFor="create-name">Product Name *</label>
              <input id="create-name" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" placeholder="e.g. Chicken Shawarma Cone (30lb)" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label" htmlFor="create-spanish" style={{ margin: 0 }}>Spanish Name</label>
                <TranslateButton sourceText={displayName} onTranslated={setSpanishName} onError={setError} />
              </div>
              <input id="create-spanish" type="text" value={spanishName} onChange={e => setSpanishName(e.target.value)} className="input" placeholder="e.g. Cono de Shawarma de Pollo (30lb)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="label" htmlFor="create-vendor">Assigned Vendor *</label>
                <select id="create-vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className="input">
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="create-category">Product Type / Category</label>
                <select id="create-category" value={productTypeId} onChange={e => setProductTypeId(e.target.value)} className="input">
                  <option value="">No Category</option>
                  {productTypes.filter(pt => pt.isActive).map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="label" htmlFor="create-code">Product Code (SKU)</label>
                <input id="create-code" type="text" value={productCode} onChange={e => setProductCode(e.target.value)} className="input" placeholder="e.g. SH-KIT-010" />
              </div>
              <div>
                <label className="label" htmlFor="create-par">Stock PAR Level</label>
                <input id="create-par" type="number" step="any" min="0" value={parLevel} onChange={e => setParLevel(e.target.value === '' ? '' : Number(e.target.value))} className="input mono" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="create-note">Notes</label>
              <input id="create-note" type="text" value={note} onChange={e => setNote(e.target.value)} className="input" placeholder="e.g. Premium Breast / Thigh Mix" />
            </div>
            <UnitFields baseUnit={baseUnitName} setBaseUnit={setBaseUnitName} displayUnit={displayUnitName} setDisplayUnit={setDisplayUnitName} multiplier={multiplier} setMultiplier={setMultiplier} idPrefix="create" />
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>{submitting ? 'Saving...' : 'Save Product'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
interface EditItemModalProps {
  item: Item;
  vendors: Vendor[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditItemModal({ item, vendors, onClose, onUpdated }: EditItemModalProps) {
  const { productTypes } = useProductTypes();
  const { selectedLocationId } = useLocationFilter();
  const isSecondaryConfigured = item.displayUnitName && item.displayUnitName !== item.baseUnitName;
  const [displayName, setDisplayName] = useState(item.displayName);
  const [spanishName, setSpanishName] = useState(item.spanishName ?? '');
  const [vendorId, setVendorId] = useState(item.vendorId);
  const [productTypeId, setProductTypeId] = useState(item.productTypeId ?? '');
  const [baseUnitName, setBaseUnitName] = useState(item.baseUnitName);
  const [displayUnitName, setDisplayUnitName] = useState(isSecondaryConfigured ? item.displayUnitName : '');
  const [multiplier, setMultiplier] = useState<number | ''>(isSecondaryConfigured ? item.multiplier : '');
  const [productCode, setProductCode] = useState(item.productCode ?? '');
  const [note, setNote] = useState(item.note ?? '');
  const [parLevel, setParLevel] = useState<number | ''>(item.parLevel ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { setError('Please select a vendor first.'); return; }
    const hasSecondary = displayUnitName.trim() !== '';
    if (hasSecondary && (multiplier === '' || Number(multiplier) <= 0)) {
      setError('Enter a valid multiplier for the pack size.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.items.update(item.id, {
        displayName,
        spanishName: spanishName.trim() || undefined,
        vendorId,
        productTypeId: productTypeId || null,
        baseUnitName,
        displayUnitName: displayUnitName || '',
        multiplier: hasSecondary ? Number(multiplier) : 1,
        productCode: productCode || undefined,
        note: note || undefined,
      });

      if (selectedLocationId && selectedLocationId !== 'all') {
        await api.items.assignToLocation(item.id, selectedLocationId, parLevel !== '' ? Number(parLevel) : 0);
      }

      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel modal-panel-md">
        <button type="button" onClick={onClose} className="modal-close" aria-label="Close modal">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="modal-header">
          <h2>Edit Product Item</h2>
          <p>Modify catalog options, procurement vendor matching, and conversion rules.</p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label" htmlFor="edit-name">Product Name *</label>
            <input id="edit-name" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="label" htmlFor="edit-spanish" style={{ margin: 0 }}>Spanish Name</label>
              <TranslateButton sourceText={displayName} onTranslated={setSpanishName} onError={setError} />
            </div>
            <input id="edit-spanish" type="text" value={spanishName} onChange={e => setSpanishName(e.target.value)} className="input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label" htmlFor="edit-vendor">Assigned Vendor *</label>
              <select id="edit-vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className="input">
                {vendors.map(v => <option key={v.id} value={v.id}>{v.displayName}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="edit-category">Product Type / Category</label>
              <select id="edit-category" value={productTypeId} onChange={e => setProductTypeId(e.target.value)} className="input">
                <option value="">No Category</option>
                {productTypes.filter(pt => pt.isActive || pt.id === item.productTypeId).map(pt => (
                  <option key={pt.id} value={pt.id}>{pt.name}{!pt.isActive ? ' (Inactive)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label" htmlFor="edit-code">Product Code (SKU)</label>
              <input id="edit-code" type="text" value={productCode} onChange={e => setProductCode(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="edit-par">Stock PAR Level</label>
              <input id="edit-par" type="number" step="any" min="0" value={parLevel} onChange={e => setParLevel(e.target.value === '' ? '' : Number(e.target.value))} className="input mono" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="edit-note">Notes</label>
            <input id="edit-note" type="text" value={note} onChange={e => setNote(e.target.value)} className="input" />
          </div>
          <UnitFields baseUnit={baseUnitName} setBaseUnit={setBaseUnitName} displayUnit={displayUnitName} setDisplayUnit={setDisplayUnitName} multiplier={multiplier} setMultiplier={setMultiplier} idPrefix="edit" />
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>{submitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
