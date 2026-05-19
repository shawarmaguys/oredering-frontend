'use client';

export default function ManagerDashboard() {
  const pendingReviews = [
    { id: 'FRM-1002', location: 'Downtown Store', submittedBy: 'John (Worker)', time: '10 mins ago' },
    { id: 'FRM-1003', location: 'Uptown Store', submittedBy: 'Sarah (Worker)', time: '1 hour ago' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Manager Portal</h1>
          <p>Review worker inventory submissions, fix anomalies, and authorize purchase orders for distribution.</p>
        </div>
      </div>

      <div className="split-layout stagger">
        
        {/* Main Content - Pending Tasks (comes first in DOM for mobile top placement) */}
        <div>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pending Stock Reviews
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Audits awaiting approval before supplier dispatches.
                </p>
              </div>
              <span className="badge badge-amber">
                <span className="badge-dot" />
                {pendingReviews.length} Action Needed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    backgroundColor: 'var(--bg-sunken)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {review.id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        • {review.time}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {review.location} <span style={{ color: 'var(--text-tertiary)' }}>submitted by</span> {review.submittedBy}
                    </p>
                  </div>
                  <button className="btn btn-secondary btn-sm">
                    Review values
                  </button>
                </div>
              ))}

              {pendingReviews.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3>No pending reviews</h3>
                  <p>All store counts are approved and synchronized.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Create New PO (comes second in DOM for sidebar desktop placement) */}
        <div>
          <div className="card" style={{
            padding: '24px',
            background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-sunken) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Create New PO
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Manually draft a custom purchase order and generate vendor-ready CSV / Slack sheets.
              </p>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Create Purchase Order
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
