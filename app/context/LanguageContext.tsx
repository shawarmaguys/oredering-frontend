'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translate } from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string;
}

const STORAGE_KEY = 'shawarmaguys_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) as Language;
        if (stored === 'en' || stored === 'es') {
          setLanguageState(stored);
        }
      } catch {
        // Fallback to default 'en'
      } finally {
        setIsInitialized(true);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // ignore
      }
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === 'en' ? 'es' : 'en';
    setLanguage(nextLang);
  };

  const t = (key: string, params?: Record<string, string | number>, fallback?: string): string => {
    return translate(language, key, params, fallback);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
