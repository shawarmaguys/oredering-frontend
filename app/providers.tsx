'use client';

import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { VendorsProvider } from './context/VendorsContext';
import { LocationsProvider } from './context/LocationsContext';
import { LocationFilterProvider } from './context/LocationFilterContext';
import { UsersProvider } from './context/UsersContext';
import { SchedulesProvider } from './context/SchedulesContext';
import { ItemsProvider } from './context/ItemsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <VendorsProvider>
          <LocationsProvider>
            <LocationFilterProvider>
              <UsersProvider>
                <SchedulesProvider>
                  <ItemsProvider>
                    {children}
                  </ItemsProvider>
                </SchedulesProvider>
              </UsersProvider>
            </LocationFilterProvider>
          </LocationsProvider>
        </VendorsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

