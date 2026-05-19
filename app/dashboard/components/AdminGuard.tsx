'use client';

import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2.5px solid var(--border-subtle)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.75s linear infinite',
            }} />
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Loading…</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div className="card" style={{
          maxWidth: 400, width: '100%', padding: '36px 32px',
          textAlign: 'center', overflow: 'hidden', position: 'relative',
        }}>
          {/* Top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, var(--danger), #f97316)',
          }} />

          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: 'var(--danger)',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 22, height: 22 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>

          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.6 }}>
            You don't have admin privileges to access this section. Contact your system administrator for access.
          </p>

          <Link href="/dashboard" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
