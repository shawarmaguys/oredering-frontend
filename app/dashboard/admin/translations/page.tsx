'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface Translation {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTranslations();
  }, []);

  const fetchTranslations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.translations.list();
      const mapped = data.map((t: any) => ({
        id: t.id,
        sourceText: t.sourceText || t.source_text,
        translatedText: t.translatedText || t.translated_text,
        sourceLanguage: t.sourceLanguage || t.source_language,
        targetLanguage: t.targetLanguage || t.target_language,
      }));
      setTranslations(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load translations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');

    try {
      await api.translations.create({
        source_text: sourceText,
        translated_text: translatedText,
        source_language: sourceLanguage,
        target_language: targetLanguage,
      });

      // Reset
      setSourceText('');
      setTranslatedText('');
      
      setShowModal(false);
      fetchTranslations();
    } catch (err: any) {
      setError(err.message || 'Failed to create translation mapping.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Translations</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Localization Dictionary</h1>
            <p>Configure translation dictionaries to help multilingual store workers conduct stock audits fluently.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138A48.25 48.25 0 0010.5 9.75M9 19.5a42.993 42.993 0 01-2.185-11.4" />
            </svg>
            Add Translation
          </button>
        </div>

        {error && !showModal && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Translations Grid / Cards */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '24px'
          }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse" style={{ padding: '24px', height: '180px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '16px', width: '25%' }} />
                <div className="skeleton" style={{ height: '24px', width: '80%' }} />
                <div className="skeleton" style={{ height: '24px', width: '60%' }} />
              </div>
            ))}
          </div>
        ) : translations.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3" />
                </svg>
              </div>
              <h3>No translations registered</h3>
              <p>Map core product descriptions to Spanish or Arabic to help workers accurately record inventory levels.</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Register Translation
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '24px'
          }} className="stagger">
            {translations.map((item) => (
              <div
                key={item.id}
                className="card card-hover"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Accent element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '60px',
                  height: '60px',
                  background: 'var(--accent-subtle)',
                  borderRadius: '50%',
                  filter: 'blur(20px)',
                  marginRight: '-15px',
                  marginTop: '-15px',
                  pointerEvents: 'none'
                }} />

                {/* Language Pair Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 6px', textTransform: 'uppercase' }}>
                    {item.sourceLanguage}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>→</span>
                  <span className="badge badge-teal" style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 6px', textTransform: 'uppercase' }}>
                    {item.targetLanguage}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Original Text</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                      "{item.sourceText}"
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Translated Text</span>
                    <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {item.translatedText}
                    </p>
                  </div>
                </div>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.6875rem',
                  color: 'var(--text-tertiary)',
                  marginTop: '4px'
                }}>
                  <span className="mono">ID: {item.id.substring(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-sm">
              <button
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Create Translation</h2>
                <p>Register standard descriptions mapped into regional dialects for worker inventory audits.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="trans-src-lang">Source Language</label>
                    <select
                      id="trans-src-lang"
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="input mono"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <option value="en">English (en)</option>
                      <option value="es">Spanish (es)</option>
                      <option value="ar">Arabic (ar)</option>
                      <option value="tr">Turkish (tr)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="trans-tgt-lang">Target Language</label>
                    <select
                      id="trans-tgt-lang"
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="input mono"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      <option value="es">Spanish (es)</option>
                      <option value="ar">Arabic (ar)</option>
                      <option value="tr">Turkish (tr)</option>
                      <option value="en">English (en)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="trans-src-txt">Source Text (English) *</label>
                  <input
                    id="trans-src-txt"
                    type="text"
                    required
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="input"
                    placeholder="e.g. Chicken Shawarma Cone"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="trans-tgt-txt">Translated Text *</label>
                  <input
                    id="trans-tgt-txt"
                    type="text"
                    required
                    value={translatedText}
                    onChange={(e) => setTranslatedText(e.target.value)}
                    className="input"
                    placeholder="e.g. مخروط شاورما دجاج"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {formSubmitting ? 'Registering...' : 'Save Translation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
