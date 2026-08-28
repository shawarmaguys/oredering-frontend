export interface Vendor {
  id: string;
  displayName: string;
}

export interface Item {
  id: string;
  displayName: string;
  spanishName?: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  productCode?: string;
  isActive: boolean;
  vendorId: string;
  vendor?: { displayName: string };
  productTypeId?: string;
  productType?: { id: string; name: string; color?: string };
  createdAt: string;
  note?: string;
  parLevel?: number;
  activeLocationCount?: number;
  locationItems?: Array<{ locationId: string; parLevel: number; isActive: boolean }>;
  backupVendors?: Array<{ vendor: { id: string; displayName: string } }>;
}

export type SortColumn = 'name' | 'vendor' | 'category' | 'code' | 'note' | 'pack' | 'baseUnit' | 'multiplier' | 'parLevel' | 'status';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'tile' | 'list';
