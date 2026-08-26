'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocations } from './LocationsContext';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'sg_selected_location';

interface LocationFilterContextType {
  selectedLocationId: string; // 'all' or a location UUID
  setSelectedLocationId: (id: string) => void;
  allowedLocations: { id: string; name: string }[];
}

const LocationFilterContext = createContext<LocationFilterContextType | undefined>(undefined);

export function LocationFilterProvider({ children }: { children: React.ReactNode }) {
  const { locations } = useLocations();
  const { user } = useAuth();

  // Derive the locations this user is allowed to see
  const allowedLocations = React.useMemo(() => {
    if (!user) return locations;
    // Workers & managers restricted by locationIds; admins see all
    if (user.role === 'ADMIN' || user.role === 'SUPER_MANAGER') return locations;
    if (user.locationIds && user.locationIds.length > 0) {
      return locations.filter(loc => user.locationIds!.includes(loc.id));
    }
    return locations;
  }, [locations, user]);

  const [selectedLocationId, setSelectedLocationIdRaw] = useState<string>('');

  // Synchronize selectedLocationId with allowedLocations
  useEffect(() => {
    if (allowedLocations.length === 0) return;

    let targetId = selectedLocationId;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== 'all' && allowedLocations.some((l) => l.id === stored)) {
        targetId = stored;
      }
    }

    if (!targetId || targetId === 'all' || !allowedLocations.some((l) => l.id === targetId)) {
      targetId = allowedLocations[0].id;
    }

    if (targetId !== selectedLocationId) {
      setSelectedLocationIdRaw(targetId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, targetId);
      }
    }
  }, [allowedLocations, selectedLocationId]);

  const setSelectedLocationId = useCallback((id: string) => {
    if (!id || id === 'all') return;
    setSelectedLocationIdRaw(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return (
    <LocationFilterContext.Provider value={{ selectedLocationId, setSelectedLocationId, allowedLocations }}>
      {children}
    </LocationFilterContext.Provider>
  );
}

export function useLocationFilter() {
  const ctx = useContext(LocationFilterContext);
  if (!ctx) throw new Error('useLocationFilter must be used within a LocationFilterProvider');
  return ctx;
}
