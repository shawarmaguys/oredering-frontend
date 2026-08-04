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
  createdAt: string;
  note?: string;
}

export type SortColumn = 'name' | 'vendor' | 'code' | 'note' | 'pack' | 'baseUnit' | 'multiplier' | 'status';
export type SortDir = 'asc' | 'desc';
export type ViewMode = 'tile' | 'list';
