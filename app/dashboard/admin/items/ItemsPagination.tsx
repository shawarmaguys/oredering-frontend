'use client';

interface ItemsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ItemsPagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: ItemsPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });

  const btnBase: React.CSSProperties = { padding: '4px 8px' };
  const activeBtnStyle: React.CSSProperties = {
    padding: '4px 10px',
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', flexWrap: 'wrap', gap: '8px' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="btn btn-secondary btn-sm" style={btnBase} title="First">«</button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="btn btn-secondary btn-sm" style={btnBase} title="Prev">‹</button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className="btn btn-secondary btn-sm"
            style={page === currentPage ? activeBtnStyle : { padding: '4px 10px' }}
          >{page}</button>
        ))}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="btn btn-secondary btn-sm" style={btnBase} title="Next">›</button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="btn btn-secondary btn-sm" style={btnBase} title="Last">»</button>
      </div>
    </div>
  );
}
