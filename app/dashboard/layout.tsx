'use client';

import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef, Suspense } from 'react';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { ContextPrefetcher } from './components/ContextPrefetcher';
import { useLocationFilter } from '../context/LocationFilterContext';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const { selectedLocationId, selectedLocation, setSelectedLocationId, allowedLocations } = useLocationFilter();
  const activeColor = selectedLocation?.color || '#3b82f6';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId');

  // Track location context switch feedback
  const [switchNotice, setSwitchNotice] = useState<{ name: string; color: string } | null>(null);
  const prevLocationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevLocationIdRef.current && selectedLocationId && prevLocationIdRef.current !== selectedLocationId) {
      if (selectedLocation) {
        setSwitchNotice({
          name: selectedLocation.name,
          color: selectedLocation.color || '#3b82f6',
        });
        const timer = setTimeout(() => {
          setSwitchNotice(null);
        }, 1800);
        prevLocationIdRef.current = selectedLocationId;
        return () => clearTimeout(timer);
      }
    }
    if (selectedLocationId) {
      prevLocationIdRef.current = selectedLocationId;
    }
  }, [selectedLocationId, selectedLocation]);

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
              <Link href="/dashboard" className="navbar-brand">
                <div className="navbar-logo">SG</div>
                <span className="navbar-wordmark">{t('brand_name')}</span>
              </Link>
              <div className="navbar-sep" />
              <span className="navbar-context">{t('stock_count_audit')}</span>
            </div>
            {/* <div className="navbar-actions">
              <LanguageSwitcher />
            </div> */}
          </div>
        </nav>
        <main style={{ flex: 1, overflow: 'hidden', width: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
            <Link href="/dashboard" className="navbar-brand">
              <div className="navbar-logo">SG</div>
              <span className="navbar-wordmark">{t('brand_name')}</span>
            </Link>
            <div className="navbar-sep" />
            <span className="navbar-context">{t('operations_portal')}</span>
          </div>

          {/* Location Filter Selector */}
          {selectedLocation && (
            <div style={{ position: 'relative', flex: '0 1 200px', minWidth: 0 }}>
              {/* Location Color Indicator Dot */}
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: activeColor,
                  position: 'absolute',
                  left: 11,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  boxShadow: `0 0 6px ${activeColor}60`,
                }}
              />

              {allowedLocations.length > 1 ? (
                <>
                  <select
                    id="navbar-location-filter"
                    value={selectedLocationId}
                    onChange={e => setSelectedLocationId(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: 26,
                      paddingRight: 24,
                      paddingTop: 5,
                      paddingBottom: 5,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      backgroundColor: `${activeColor}18`,
                      color: activeColor,
                      border: `1px solid ${activeColor}35`,
                      borderRadius: '6px',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                    title="Filter all views by location"
                  >
                    {allowedLocations.map(loc => (
                      <option key={loc.id} value={loc.id} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  {/* Chevron icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    style={{
                      width: 11,
                      height: 11,
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: activeColor,
                      pointerEvents: 'none',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </>
              ) : (
                <div
                  style={{
                    width: '100%',
                    paddingLeft: 26,
                    paddingRight: 12,
                    paddingTop: 5,
                    paddingBottom: 5,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    backgroundColor: `${activeColor}18`,
                    color: activeColor,
                    border: `1px solid ${activeColor}35`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedLocation.name}
                </div>
              )}
            </div>
          )}

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
              type="button"
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

      {/* Strong Context Switch Banner */}
      {switchNotice && (
        <div
          style={{
            position: 'fixed',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 20px',
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--bg-elevated)',
            border: `1.5px solid ${switchNotice.color}`,
            boxShadow: `0 12px 32px -4px ${switchNotice.color}40, var(--shadow-xl)`,
            animation: 'switchSlideDown 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: `${switchNotice.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: switchNotice.color,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: switchNotice.color, textTransform: 'uppercase', lineHeight: 1.2 }}>
              Location Context Switched
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.2 }}>
              {switchNotice.name}
            </span>
          </div>
        </div>
      )}

      {/* Page Body */}
      <main style={{ flex: 1, overflow: 'hidden', width: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Kick off all context fetches in the background as soon as the dashboard mounts */}
        <ContextPrefetcher />
        <div key={selectedLocationId} className="dashboard-body animate-fade-up">
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
