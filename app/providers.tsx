'use client';

import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { VendorsProvider } from './context/VendorsContext';
import { LocationsProvider } from './context/LocationsContext';
import { UsersProvider } from './context/UsersContext';
import { SchedulesProvider } from './context/SchedulesContext';
import { ItemsProvider } from './context/ItemsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <VendorsProvider>
          <LocationsProvider>
            <UsersProvider>
              <SchedulesProvider>
                <ItemsProvider>
                  {children}
                </ItemsProvider>
              </SchedulesProvider>
            </UsersProvider>
          </LocationsProvider>
        </VendorsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

