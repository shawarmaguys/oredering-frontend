import { useEffect, useRef } from 'react';
import { Item, SortColumn, SortDir, PendingItemEdit } from './types';
import { ProductType } from '../../../context/ProductTypesContext';

// ─── Infinite Scroll Sentinel ────────────────────────────────────────────────
interface InfiniteScrollSentinelProps {
  hasMore: boolean;
  onLoadMore: () => void;
}

export function InfiniteScrollSentinel({ hasMore, onLoadMore }: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, onLoadMore]);

  if (!hasMore) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
        ✓ All products loaded
      </div>
    );
  }

  return (
    <div
      ref={sentinelRef}
      style={{
        textAlign: 'center',
        padding: '16px 0',
        color: 'var(--text-tertiary)',
        fontSize: '0.8125rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <svg
        className="animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        style={{ width: 14, height: 14 }}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          style={{ opacity: 0.75 }}
        />
      </svg>
      <span>Loading more products...</span>
    </div>
  );
}

// ─── Tile Card ───────────────────────────────────────────────────────────────
interface ItemTileCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (id: string, name: string, activeLocationCount?: number) => void;
}

export function ItemTileCard({ item, onEdit, onDelete }: ItemTileCardProps) {
  const isSecondary = !!(
    item.displayUnitName &&
    item.displayUnitName.trim() !== '' &&
    item.multiplier &&
    Number(item.multiplier) > 1
  );
  return (
    <div className="card card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.displayName}</h3>
              {item.productType && (
                <span className="badge" style={{ backgroundColor: item.productType.color ? `${item.productType.color}22` : 'var(--bg-tertiary)', color: item.productType.color || 'var(--text-secondary)', borderColor: item.productType.color || 'var(--border-default)', fontSize: '0.7rem' }}>
                  {item.productType.name}
                </span>
              )}
            </div>
            {item.spanishName && <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontStyle: 'italic', display: 'block' }}>🇪🇸 {item.spanishName}</span>}
            {item.vendor && <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.vendor.displayName}</span>}
            {item.backupVendors && item.backupVendors.length > 0 && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', display: 'block' }}>+ Backup: {item.backupVendors.map(bv => bv.vendor.displayName).join(', ')}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="btn btn-secondary btn-sm"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
              aria-label={`Edit ${item.displayName}`}
              title="Edit Product Details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 13, height: 13 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id, item.displayName, item.activeLocationCount ?? item.locationItems?.length)}
              className="btn btn-secondary btn-sm"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444',
                borderColor: '#fca5a5',
              }}
              aria-label={`Delete ${item.displayName}`}
              title="Remove / Delete Product"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 13, height: 13 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
          {item.productCode && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>SKU:</span>
              <span className="mono" style={{ color: 'var(--text-secondary)' }}>{item.productCode}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Units:</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badge-neutral">{item.baseUnitName}</span>
              {isSecondary && (
                <>
                  <span style={{ color: 'var(--text-tertiary)' }}>←</span>
                  <span className="badge badge-teal">{item.displayUnitName}</span>
                  <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>x{item.multiplier}</span>
                </>
              )}
            </div>
          </div>
          {(() => {
            const multiplier = item.multiplier && Number(item.multiplier) > 0 ? Number(item.multiplier) : 1;
            const isPackDefined = isSecondary && multiplier > 1;
            const parInBase = item.parLevel ?? 0;
            const parInPack = isPackDefined ? parInBase / multiplier : parInBase;
            const formattedPar = Number.isInteger(parInPack) ? parInPack.toFixed(0) : (Math.round(parInPack * 100) / 100).toString();
            const parUnitLabel = isPackDefined ? item.displayUnitName : item.baseUnitName;

            return (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>PAR Level:</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formattedPar} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>{parUnitLabel}</span>
                  {isPackDefined && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '4px' }}>
                      ({parInBase} {item.baseUnitName})
                    </span>
                  )}
                </span>
              </div>
            );
          })()}
          {item.note && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Note:</span>
              <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }} className="line-clamp-2">{item.note}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
        <span className="mono">ID: {item.id.substring(0, 8)}</span>
        {item.createdAt && <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

// ─── Tile View ───────────────────────────────────────────────────────────────
interface ItemsTileViewProps {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (id: string, name: string, activeLocationCount?: number) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function ItemsTileView({ items, onEdit, onDelete, hasMore, onLoadMore }: ItemsTileViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '24px' }} className="stagger">
        {items.map(item => (
          <ItemTileCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <InfiniteScrollSentinel hasMore={hasMore} onLoadMore={onLoadMore} />
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────────────────
interface ItemsTableViewProps {
  items: Item[];
  productTypes?: ProductType[];
  sortCol: SortColumn;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string, name: string, activeLocationCount?: number) => void;
  onUpdatePar?: (itemId: string, newPar: number) => void;
  pendingEdits?: Record<string, PendingItemEdit>;
  onFieldChange?: (
    itemId: string,
    field: keyof PendingItemEdit,
    originalVal: any,
    newVal: any
  ) => void;
  pendingParEdits?: Record<string, number>;
  onParChange?: (itemId: string, originalPar: number, newPar: number) => void;
  canEdit?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

function SortIndicator({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  return <>{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</>;
}

export function ItemsTableView({
  items,
  productTypes = [],
  sortCol,
  sortDir,
  onSort,
  onEdit,
  onDelete,
  onUpdatePar,
  pendingEdits = {},
  onFieldChange,
  pendingParEdits = {},
  onParChange,
  canEdit = true,
  hasMore,
  onLoadMore,
}: ItemsTableViewProps) {
  const th = (col: SortColumn, label: string, extraStyle?: React.CSSProperties) => (
    <th style={{ cursor: 'pointer', ...extraStyle }} onClick={() => onSort(col)}>
      {label}<SortIndicator col={col} active={sortCol === col} dir={sortDir} />
    </th>
  );

  return (
    <div className="table-scroll-container">
      <div className="table-responsive-wrap">
        <table className="data-table items-table">
          <thead>
            <tr>
              {th('name', 'Display Name', { paddingLeft: '24px', minWidth: '180px' })}
              {th('category', 'Category', { minWidth: '140px' })}
              {th('vendor', 'Assigned Vendor', { minWidth: '140px' })}
              {th('code', 'Product Code', { width: '120px' })}
              {th('parLevel', 'PAR Level', { width: '120px' })}
              {th('note', 'Notes', { minWidth: '160px' })}
              {th('pack', 'Pack Size', { width: '110px' })}
              {th('baseUnit', 'Stock Unit', { width: '110px' })}
              {th('multiplier', 'Multiplier', { textAlign: 'center', width: '85px' })}
              {th('status', 'Status', { textAlign: 'center', width: '85px' })}
              <th style={{ textAlign: 'right', paddingRight: '24px', width: '90px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemEdits: PendingItemEdit =
                pendingEdits[item.id] ||
                (pendingParEdits[item.id] !== undefined
                  ? { parLevel: pendingParEdits[item.id] }
                  : {});

              const isEdited = (field: keyof PendingItemEdit) => itemEdits[field] !== undefined;

              const currentProductTypeId =
                itemEdits.productTypeId !== undefined
                  ? itemEdits.productTypeId
                  : (item.productTypeId || item.productType?.id || null);
              const currentProductCode =
                itemEdits.productCode !== undefined
                  ? itemEdits.productCode
                  : (item.productCode || '');
              const currentNote =
                itemEdits.note !== undefined ? itemEdits.note : (item.note || '');
              const currentBaseUnitName =
                itemEdits.baseUnitName !== undefined
                  ? itemEdits.baseUnitName
                  : (item.baseUnitName || '');

              const isSecondaryConfigured = !!(
                item.displayUnitName &&
                item.displayUnitName.trim() !== '' &&
                item.displayUnitName.trim().toLowerCase() !== (item.baseUnitName || '').trim().toLowerCase() &&
                item.multiplier &&
                Number(item.multiplier) > 1
              );
              const initialPackSize = isSecondaryConfigured ? item.displayUnitName : '';

              const currentDisplayUnitName =
                itemEdits.displayUnitName !== undefined
                  ? itemEdits.displayUnitName
                  : initialPackSize;

              const hasPack =
                currentDisplayUnitName.trim() !== '' &&
                currentDisplayUnitName.trim().toLowerCase() !== currentBaseUnitName.trim().toLowerCase();

              const currentMultiplier = hasPack
                ? (itemEdits.multiplier !== undefined
                  ? itemEdits.multiplier
                  : (isSecondaryConfigured ? (Number(item.multiplier) || 1) : 1))
                : 1;

              const currentIsActive =
                itemEdits.isActive !== undefined
                  ? itemEdits.isActive
                  : (item.isActive ?? true);

              const mult = currentMultiplier > 0 ? currentMultiplier : 1;
              const isPackDefined = hasPack && mult > 1;

              const originalParBase = item.parLevel ?? 0;
              const currentParBase =
                itemEdits.parLevel !== undefined ? itemEdits.parLevel : originalParBase;

              const displayParVal = isPackDefined
                ? currentParBase / mult
                : currentParBase;
              const formattedParVal = Number.isInteger(displayParVal)
                ? displayParVal
                : Math.round(displayParVal * 100) / 100;
              const unitLabel = isPackDefined ? currentDisplayUnitName : currentBaseUnitName;

              const hasAnyEdits = Object.keys(itemEdits).length > 0;

              return (
                <tr
                  key={item.id}
                  style={{
                    verticalAlign: 'top',
                    backgroundColor: hasAnyEdits
                      ? 'rgba(13, 148, 136, 0.05)'
                      : undefined,
                  }}
                >
                  {/* Display Name */}
                  <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{item.displayName}</div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: item.spanishName ? 'var(--accent)' : 'transparent',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        marginTop: '2px',
                        userSelect: item.spanishName ? 'auto' : 'none',
                      }}
                    >
                      {item.spanishName ? `🇪🇸 ${item.spanishName}` : '🇪🇸 placeholder'}
                    </div>
                  </td>

                  {/* Category */}
                  <td>
                    <select
                      disabled={!canEdit}
                      aria-label={`Category for ${item.displayName}`}
                      value={currentProductTypeId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value || null;
                        if (onFieldChange) {
                          onFieldChange(item.id, 'productTypeId', item.productTypeId || item.productType?.id || null, val);
                        }
                      }}
                      className="input"
                      style={{
                        padding: '4px 24px 4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '100%',
                        minWidth: '135px',
                        borderColor: isEdited('productTypeId') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('productTypeId')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('productTypeId') ? 600 : undefined,
                        cursor: canEdit ? 'pointer' : 'default',
                      }}
                    >
                      <option value="">Uncategorized</option>
                      {productTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name}
                        </option>
                      ))}
                      {item.productType && !productTypes.some((pt) => pt.id === (item.productTypeId || item.productType?.id)) && (
                        <option value={item.productType.id}>{item.productType.name}</option>
                      )}
                    </select>
                  </td>

                  {/* Assigned Vendor */}
                  <td>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {item.vendor?.displayName || 'Unknown Vendor'}
                    </span>
                    {item.backupVendors && item.backupVendors.length > 0 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        + Backup: {item.backupVendors.map((bv) => bv.vendor.displayName).join(', ')}
                      </div>
                    )}
                  </td>

                  {/* Product Code */}
                  <td>
                    <input
                      type="text"
                      disabled={!canEdit}
                      aria-label={`Product code for ${item.displayName}`}
                      value={currentProductCode}
                      placeholder="Code / SKU"
                      onChange={(e) => {
                        if (onFieldChange) {
                          onFieldChange(item.id, 'productCode', item.productCode || '', e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="input mono"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '100%',
                        minWidth: '95px',
                        borderColor: isEdited('productCode') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('productCode')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('productCode') ? 600 : undefined,
                      }}
                    />
                  </td>

                  {/* PAR Level */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '85px' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={!canEdit}
                        aria-label={`PAR level for ${item.displayName}`}
                        value={formattedParVal}
                        onChange={(e) => {
                          const valInInput = e.target.value === '' ? 0 : Number(e.target.value);
                          const valInBase = isPackDefined ? valInInput * mult : valInInput;
                          if (onFieldChange) {
                            onFieldChange(item.id, 'parLevel', originalParBase, valInBase);
                          } else if (onParChange) {
                            onParChange(item.id, originalParBase, valInBase);
                          } else if (onUpdatePar && valInBase !== originalParBase) {
                            onUpdatePar(item.id, valInBase);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="input mono"
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.8125rem',
                          height: '30px',
                          width: '100%',
                          textAlign: 'right',
                          borderColor: isEdited('parLevel') ? 'var(--accent, #0d9488)' : undefined,
                          backgroundColor: isEdited('parLevel')
                            ? 'rgba(13, 148, 136, 0.12)'
                            : undefined,
                          fontWeight: isEdited('parLevel') ? 600 : undefined,
                        }}
                      />
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-tertiary)',
                          textAlign: 'right',
                          lineHeight: 1.2,
                          paddingRight: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={unitLabel || 'units'}
                      >
                        {unitLabel || 'units'}
                        {isPackDefined && currentParBase > 0 && (
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', opacity: 0.85, marginLeft: '4px' }}>
                            ({currentParBase} {currentBaseUnitName})
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Notes */}
                  <td>
                    <input
                      type="text"
                      disabled={!canEdit}
                      aria-label={`Notes for ${item.displayName}`}
                      value={currentNote}
                      placeholder="Add note..."
                      onChange={(e) => {
                        if (onFieldChange) {
                          onFieldChange(item.id, 'note', item.note || '', e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="input"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '100%',
                        minWidth: '140px',
                        borderColor: isEdited('note') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('note')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('note') ? 600 : undefined,
                      }}
                    />
                  </td>

                  {/* Pack Size */}
                  <td>
                    <input
                      type="text"
                      disabled={!canEdit}
                      aria-label={`Pack size for ${item.displayName}`}
                      value={currentDisplayUnitName}
                      placeholder="e.g. Case"
                      onChange={(e) => {
                        if (onFieldChange) {
                          onFieldChange(item.id, 'displayUnitName', initialPackSize, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="input"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '100%',
                        minWidth: '85px',
                        borderColor: isEdited('displayUnitName') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('displayUnitName')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('displayUnitName') ? 600 : undefined,
                      }}
                    />
                  </td>

                  {/* Stock Unit */}
                  <td>
                    <input
                      type="text"
                      disabled={!canEdit}
                      aria-label={`Stock unit for ${item.displayName}`}
                      value={currentBaseUnitName}
                      placeholder="e.g. Each"
                      onChange={(e) => {
                        if (onFieldChange) {
                          onFieldChange(item.id, 'baseUnitName', item.baseUnitName || '', e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="input"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '100%',
                        minWidth: '85px',
                        borderColor: isEdited('baseUnitName') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('baseUnitName')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('baseUnitName') ? 600 : undefined,
                      }}
                    />
                  </td>

                  {/* Multiplier */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      disabled={!canEdit || !hasPack}
                      title={!hasPack ? 'Enter a pack size first to set multiplier' : undefined}
                      aria-label={`Multiplier for ${item.displayName}`}
                      value={currentMultiplier}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 1 : Number(e.target.value);
                        if (onFieldChange) {
                          const origMult = isSecondaryConfigured ? (Number(item.multiplier) || 1) : 1;
                          onFieldChange(item.id, 'multiplier', origMult, val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="input mono"
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8125rem',
                        height: '30px',
                        width: '65px',
                        textAlign: 'center',
                        opacity: !hasPack ? 0.5 : 1,
                        borderColor: isEdited('multiplier') ? 'var(--accent, #0d9488)' : undefined,
                        backgroundColor: isEdited('multiplier')
                          ? 'rgba(13, 148, 136, 0.12)'
                          : undefined,
                        fontWeight: isEdited('multiplier') ? 600 : undefined,
                      }}
                    />
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={currentIsActive}
                      aria-label={`Toggle active status for ${item.displayName}`}
                      disabled={!canEdit}
                      onClick={() => {
                        if (!canEdit || !onFieldChange) return;
                        onFieldChange(item.id, 'isActive', !!item.isActive, !currentIsActive);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px',
                        borderRadius: '9999px',
                        border: isEdited('isActive')
                          ? '1.5px solid var(--accent, #0d9488)'
                          : '1.5px solid transparent',
                        backgroundColor: isEdited('isActive')
                          ? 'rgba(13, 148, 136, 0.15)'
                          : 'transparent',
                        cursor: canEdit ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        userSelect: 'none',
                        lineHeight: 0,
                      }}
                      title={canEdit ? `Click to toggle status (currently ${currentIsActive ? 'Active' : 'Inactive'})` : undefined}
                    >
                      <span
                        style={{
                          width: '34px',
                          height: '18px',
                          borderRadius: '9999px',
                          backgroundColor: currentIsActive ? 'var(--success, #16a34a)' : 'var(--border-default, #475569)',
                          position: 'relative',
                          display: 'inline-block',
                          transition: 'background-color 0.2s',
                          flexShrink: 0,
                          boxShadow: currentIsActive ? '0 0 6px rgba(22, 163, 74, 0.35)' : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            position: 'absolute',
                            top: '2px',
                            left: currentIsActive ? '18px' : '2px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
                          }}
                        />
                      </span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          width: '30px',
                          height: '30px',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-md, 6px)',
                        }}
                        aria-label={`Edit ${item.displayName}`}
                        title="Edit Product Details"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          style={{ width: 14, height: 14 }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDelete(
                            item.id,
                            item.displayName,
                            item.activeLocationCount ?? item.locationItems?.length
                          )
                        }
                        className="btn btn-secondary btn-sm"
                        style={{
                          width: '30px',
                          height: '30px',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-md, 6px)',
                          color: '#ef4444',
                          borderColor: '#fca5a5',
                        }}
                        aria-label={`Delete ${item.displayName}`}
                        title="Remove / Delete Product"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          style={{ width: 14, height: 14 }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <InfiniteScrollSentinel hasMore={hasMore} onLoadMore={onLoadMore} />
    </div>
  );
}
