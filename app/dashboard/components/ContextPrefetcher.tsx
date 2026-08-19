'use client';

/**
 * ContextPrefetcher
 *
 * Background prefetcher for all global reference contexts (vendors, locations, users, schedules, items)
 * to ensure persistent client-side cache and instant page rendering.
 */

import { useVendors } from '../../context/VendorsContext';
import { useLocations } from '../../context/LocationsContext';
import { useUsers } from '../../context/UsersContext';
import { useSchedules } from '../../context/SchedulesContext';
import { useItems } from '../../context/ItemsContext';
import { useReports } from '../../context/ReportsContext';

export function ContextPrefetcher() {
  useVendors();
  useLocations();
  useUsers();
  useSchedules();
  useItems();
  useReports();

  return null;
}
