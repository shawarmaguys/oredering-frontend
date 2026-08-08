'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');

  // Allow unauthenticated access when a recordId is present (stock take form via Slack link)
  const isPublicStockTake = !!recordId && pathname === '/dashboard';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicStockTake) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname, isPublicStockTake]);

  // Show nothing while loading auth state (but not for public stock take links)
  if (isLoading && !isPublicStockTake) return null;

  // Unauthenticated but accessing a public stock take form — minimal wrapper
  if (!isAuthenticated && isPublicStockTake) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
        {/* Minimal branded navbar */}
        <nav className="navbar">
          <div className="navbar-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="navbar-logo">SG</div>
              <span className="navbar-wordmark">{t('brand_name')}</span>
              <div className="navbar-sep" />
              <span className="navbar-context">{t('stock_count_audit')}</span>
            </div>
            {/* <div className="navbar-actions">
              <LanguageSwitcher />
            </div> */}
          </div>
        </nav>
        <main style={{ flex: 1, overflow: 'auto', width: '100%' }}>
          <div className="dashboard-body animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const roleTranslation = user?.role === 'ADMIN' ? t('role_admin') : user?.role === 'MANAGER' ? t('role_manager') : user?.role === 'WORKER' ? t('role_worker') : user?.role;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a href="/dashboard" className="navbar-brand">
              <div className="navbar-logo">SG</div>
              <span className="navbar-wordmark">{t('brand_name')}</span>
            </a>
            <div className="navbar-sep" />
            <span className="navbar-context">{t('operations_portal')}</span>
          </div>

          {/* Right side */}
          <div className="navbar-actions">
            {/* Language Switcher */}
            {/* <LanguageSwitcher /> */}

            {/* User info — hidden on mobile */}
            <div className="hidden sm:block" style={{ textAlign: 'right', marginLeft: '6px' }}>
              <div className="navbar-user-name">{user?.fullName}</div>
              <div className="navbar-user-role">{roleTranslation}</div>
            </div>

            {/* Divider */}
            <div className="navbar-sep hidden sm:block" />

            {/* Logout */}
            <button
              onClick={logout}
              className="navbar-icon-btn"
              aria-label={t('sign_out')}
              title={t('sign_out')}
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
