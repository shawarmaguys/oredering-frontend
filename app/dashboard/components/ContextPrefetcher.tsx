'use client';

/**
 * ContextPrefetcher
 *
 * Renders nothing. Its only job is to call every context hook so their
 * internal `useEffect` initialization fires the moment the dashboard
 * layout mounts. By the time the user clicks into any admin page, all
 * reference data (vendors, locations, users, schedules, items) is already
 * loaded and cached in memory.
 */

import { useVendors } from '../../context/VendorsContext';
import { useLocations } from '../../context/LocationsContext';
import { useUsers } from '../../context/UsersContext';
import { useSchedules } from '../../context/SchedulesContext';
import { useItems } from '../../context/ItemsContext';

export function ContextPrefetcher() {
  // Touching each hook is enough — their providers run the fetch on first access.
  // No return value is used here; this is purely a side-effect trigger.
  useVendors();
  useLocations();
  useUsers();
  useSchedules();
  useItems();

  return null;
}
