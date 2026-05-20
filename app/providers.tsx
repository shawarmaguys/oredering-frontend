'use client';

import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </AuthProvider>
  );
}
