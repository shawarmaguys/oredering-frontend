import { useEffect, useRef } from 'react';
import { Item, SortColumn, SortDir } from './types';

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
  onDelete: (id: string, name: string) => void;
}

export function ItemTileCard({ item, onEdit, onDelete }: ItemTileCardProps) {
  const isSecondary = item.displayUnitName && item.displayUnitName !== item.baseUnitName;
  return (
    <div className="card card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.displayName}</h3>
            {item.spanishName && <span style={{ fontSize: '0.8125rem', color: 'var(--accent)', fontStyle: 'italic', display: 'block' }}>🇪🇸 {item.spanishName}</span>}
            {item.vendor && <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.vendor.displayName}</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => onEdit(item)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }} title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
              Edit
            </button>
            <button onClick={() => onDelete(item.id, item.displayName)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', color: '#ef4444', borderColor: '#fca5a5' }} title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              Delete
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
  onDelete: (id: string, name: string) => void;
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
  sortCol: SortColumn;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string, name: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

function SortIndicator({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  return <>{active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</>;
}

export function ItemsTableView({ items, sortCol, sortDir, onSort, onEdit, onDelete, hasMore, onLoadMore }: ItemsTableViewProps) {
  const th = (col: SortColumn, label: string, extraStyle?: React.CSSProperties) => (
    <th style={{ cursor: 'pointer', ...extraStyle }} onClick={() => onSort(col)}>
      {label}<SortIndicator col={col} active={sortCol === col} dir={sortDir} />
    </th>
  );

  return (
    <div className="table-scroll-container">
      <div className="table-responsive-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {th('name', 'Display Name', { paddingLeft: '24px' })}
              {th('vendor', 'Assigned Vendor')}
              {th('code', 'Product Code')}
              {th('note', 'Notes')}
              {th('pack', 'Pack Size')}
              {th('baseUnit', 'Individual Stock Unit')}
              {th('multiplier', 'Multiplier', { textAlign: 'center' })}
              {th('status', 'Status', { textAlign: 'center' })}
              <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isSecondary = item.displayUnitName && item.displayUnitName !== item.baseUnitName;
              return (
                <tr key={item.id}>
                  <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div>{item.displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: item.spanishName ? 'var(--accent)' : 'transparent', fontWeight: 400, fontStyle: 'italic', marginTop: '2px', userSelect: item.spanishName ? 'auto' : 'none' }}>
                      {item.spanishName ? `🇪🇸 ${item.spanishName}` : '🇪🇸 placeholder'}
                    </div>
                  </td>
                  <td><span style={{ color: 'var(--text-secondary)' }}>{item.vendor?.displayName || 'Unknown Vendor'}</span></td>
                  <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.productCode || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || '—'}</td>
                  <td>
                    {isSecondary
                      ? <span className="badge badge-teal">{item.displayUnitName}</span>
                      : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>}
                  </td>
                  <td><span className="badge badge-neutral">{item.baseUnitName}</span></td>
                  <td className="mono" style={{ textAlign: 'center', fontSize: '0.8125rem' }}>{isSecondary ? item.multiplier : '1'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-green"><span className="badge-dot" />Active</span>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => onEdit(item)} className="btn btn-secondary btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                        Edit
                      </button>
                      <button onClick={() => onDelete(item.id, item.displayName)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        Delete
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
