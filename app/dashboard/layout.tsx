'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

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
            <span className="navbar-context">Operations Portal</span>
          </div>

          {/* Right side */}
          <div className="navbar-actions">
            {/* User info — hidden on mobile */}
            <div className="hidden sm:block" style={{ textAlign: 'right' }}>
              <div className="navbar-user-name">{user?.fullName}</div>
              <div className="navbar-user-role">{user?.role}</div>
            </div>

            {/* Divider */}
            <div className="navbar-sep hidden sm:block" />

            {/* Logout */}
            <button
              onClick={logout}
              className="navbar-icon-btn"
              aria-label="Sign out"
              title="Sign out"
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
