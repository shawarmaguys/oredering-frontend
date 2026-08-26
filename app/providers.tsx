'use client';

import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { VendorsProvider } from './context/VendorsContext';
import { LocationsProvider } from './context/LocationsContext';
import { LocationFilterProvider } from './context/LocationFilterContext';
import { UsersProvider } from './context/UsersContext';
import { SchedulesProvider } from './context/SchedulesContext';
import { ItemsProvider } from './context/ItemsContext';
import { ProductTypesProvider } from './context/ProductTypesContext';
import { ReportsProvider } from './context/ReportsContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProductTypesProvider>
          <LocationsProvider>
            <LocationFilterProvider>
              <VendorsProvider>
                <UsersProvider>
                  <SchedulesProvider>
                    <ItemsProvider>
                      <ReportsProvider>
                        {children}
                      </ReportsProvider>
                    </ItemsProvider>
                  </SchedulesProvider>
                </UsersProvider>
              </VendorsProvider>
            </LocationFilterProvider>
          </LocationsProvider>
        </ProductTypesProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

