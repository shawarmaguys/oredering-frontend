'use client';

/**
 * ContextPrefetcher
 *
 * Lightweight background prefetcher for reference contexts (vendors, locations)
 * without touching heavy tables or blocking page renders.
 */

import { useVendors } from '../../context/VendorsContext';
import { useLocations } from '../../context/LocationsContext';

export function ContextPrefetcher() {
  useVendors();
  useLocations();

  return null;
}

