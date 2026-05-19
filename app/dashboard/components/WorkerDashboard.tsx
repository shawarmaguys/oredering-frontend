'use client';

export default function WorkerDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Store Portal</h1>
          <p>Record kitchen stock audits, view schedules, and submit daily physical quantities.</p>
        </div>
      </div>

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
              backgroundColor: 'var(--warning-subtle)',
              border: '1px solid rgba(217,119,6,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Action Required
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                You have pending inventory submissions due today.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Active form */}
            <div
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
                  End of Day Stock Form
                </h3>
                <span className="badge badge-amber" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                  <span className="badge-dot" />
                  Due in 2 hours
                </span>
              </div>
              <button className="btn btn-primary">
                Start submission
              </button>
            </div>

            {/* Completed form */}
            <div
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
                opacity: 0.65
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Morning Inventory Check
                </h3>
                <span className="badge badge-green" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  Submitted
                </span>
              </div>
              <button disabled className="btn btn-secondary">
                View submitted
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

