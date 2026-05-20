'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

export type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load selected language from localStorage on mount
  useEffect(() => {
    const storedLang = localStorage.getItem('app_language') as Language;
    if (storedLang === 'en' || storedLang === 'es') {
      setLanguageState(storedLang);
    }
  }, []);

  // Fetch translations when authenticated
  useEffect(() => {
    async function fetchTranslations() {
      if (!isAuthenticated) {
        setTranslations({});
        return;
      }
      setLoading(true);
      try {
        const data = await api.translations.list();
        const mapping: Record<string, string> = {};
        data.forEach((item: any) => {
          if (item.targetLanguage === 'es') {
            mapping[item.sourceText.toLowerCase().trim()] = item.translatedText;
          }
        });
        setTranslations(mapping);
      } catch (err) {
        console.error('Failed to fetch translations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTranslations();
  }, [isAuthenticated]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  // Translate function
  const t = (text: string): string => {
    if (!text) return '';
    if (language === 'en') return text;
    
    const key = text.toLowerCase().trim();
    return translations[key] || text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
