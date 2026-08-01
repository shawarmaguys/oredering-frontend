'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '20px',
        padding: '3px',
        gap: '2px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        title="Switch to English"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: language === 'en' ? 700 : 500,
          color: language === 'en' ? '#ffffff' : 'var(--text-tertiary)',
          backgroundColor: language === 'en' ? 'var(--accent)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('es')}
        title="Cambiar a Español"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '0.75rem',
          fontWeight: language === 'es' ? 700 : 500,
          color: language === 'es' ? '#ffffff' : 'var(--text-tertiary)',
          backgroundColor: language === 'es' ? 'var(--accent)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>🇪🇸</span>
        <span>ES</span>
      </button>
    </div>
  );
}
