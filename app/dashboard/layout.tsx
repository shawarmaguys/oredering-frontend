'use client';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a href="/dashboard" className="navbar-brand">
              <div className="navbar-logo">SG</div>
              <span className="navbar-wordmark">ShawarmaGuys</span>
            </a>
            <div className="navbar-sep" />
            <span className="navbar-context">{t('Operations Portal')}</span>
          </div>

          {/* Right side */}
          <div className="navbar-actions">
            {/* Language Selector */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
              style={{
                padding: '6px 10px',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--bg-sunken)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 500,
                marginRight: '8px'
              }}
            >
              <option value="en">🇺🇸 EN</option>
              <option value="es">🇪🇸 ES</option>
            </select>

            {/* User info — hidden on mobile */}
            <div className="hidden sm:block" style={{ textAlign: 'right' }}>
              <div className="navbar-user-name">{user?.fullName}</div>
              <div className="navbar-user-role">
                {t(user?.role === 'WORKER' ? 'Kitchen Worker' : user?.role === 'MANAGER' ? 'Inventory Manager' : user?.role || '')}
              </div>
            </div>

            {/* Divider */}
            <div className="navbar-sep hidden sm:block" />

            {/* Logout */}
            <button
              onClick={logout}
              className="navbar-icon-btn"
              aria-label={t('Log Out')}
              title={t('Log Out')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 16, height: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Page Body */}
      <main style={{ flex: 1, overflow: 'auto', width: '100%' }}>
        <div className="dashboard-body animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
