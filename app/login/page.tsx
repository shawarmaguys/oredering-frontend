'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials. Please check your email and password.');
      }

      const data = await response.json();

      if (data.access_token && data.user) {
        login(data.access_token, data.user);
        router.push(redirectTo);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Left decorative panel — hidden on mobile */}
      <div
        className="hidden lg:flex"
        style={{
          width: '45%',
          background: 'linear-gradient(145deg, #0f172a 0%, #134e4a 60%, #0d9488 100%)',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '0.9375rem',
          }}>
            SG
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>
            ShawarmaGuys
          </span>
        </div>

        {/* Quote */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 40, height: 3, borderRadius: 2,
            backgroundColor: 'var(--accent)', marginBottom: 20,
          }} />
          <p style={{
            color: 'rgba(255,255,255,0.85)', fontSize: '1.125rem',
            lineHeight: 1.65, fontWeight: 400, letterSpacing: '-0.01em',
          }}>
            Streamline your inventory, vendors, and purchase orders — all in one place.
          </p>
          <p style={{ marginTop: 20, color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
            Internal Operations Platform · v1.0
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-up">
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            {/* Mobile logo */}
            <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '0.875rem',
              }}>SG</div>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                ShawarmaGuys
              </span>
            </div>

            <h1 style={{
              fontSize: '1.625rem', fontWeight: 700,
              color: 'var(--text-primary)', letterSpacing: '-0.025em',
              marginBottom: 6,
            }}>
              Sign in to your account
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
              Enter your credentials to access the portal.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shawarmaguys.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="input-prefix-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  style={{ paddingRight: 40, paddingLeft: 13 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 11, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 2,
                    display: 'flex', alignItems: 'center',
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ marginTop: 8, width: '100%' }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: 28, fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            Internal use only · ShawarmaGuys Operations
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
