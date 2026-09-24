'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { Item, Vendor } from './types';

interface EnableProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName: string;
  vendors: Vendor[];
  onEnabled: () => void;
  onError: (msg: string) => void;
}

export function EnableProductsModal({
  isOpen,
  onClose,
  locationId,
  locationName,
  vendors,
  onEnabled,
  onError,
}: EnableProductsModalProps) {
  const [masterItems, setMasterItems] = useState<Item[]>([]);
  const [unassignedVendors, setUnassignedVendors] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [masterVendorFilter, setMasterVendorFilter] = useState('all');
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([]);
  const [batchEnabling, setBatchEnabling] = useState(false);

  useEffect(() => {
    if (!isOpen || !locationId || locationId === 'all') return;

    let isMounted = true;
    setMasterLoading(true);
    setSelectedMasterIds([]);
    setMasterVendorFilter('all');
    setMasterSearch('');

    const loadData = async () => {
      try {
        const [itemsData, unassignedVendorsData] = await Promise.all([
          api.items.listUnassigned(locationId),
          api.vendors.listUnassigned(locationId),
        ]);
        if (isMounted) {
          setMasterItems(itemsData || []);
          setUnassignedVendors(unassignedVendorsData || []);
        }
      } catch (err: any) {
        if (isMounted) {
          onError(err?.message || 'Failed to load available products.');
        }
      } finally {
        if (isMounted) {
          setMasterLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, locationId, onError]);

  if (!isOpen) return null;

  const handleToggleSelectMaster = (itemId: string) => {
    setSelectedMasterIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleEnableSelectedMaster = async () => {
    if (selectedMasterIds.length === 0) return;
    setBatchEnabling(true);
    try {
      await Promise.all(
        selectedMasterIds.map((itemId) =>
          api.items.assignToLocation(itemId, locationId, 0)
        )
      );
      setMasterItems((prev) => prev.filter((i) => !selectedMasterIds.includes(i.id)));
      setSelectedMasterIds([]);
      onEnabled();
    } catch (err: any) {
      onError(err?.message || 'Failed to enable selected products.');
    } finally {
      setBatchEnabling(false);
    }
  };

  const enabledVendorsList = vendors || [];
  const enabledNames = new Set(enabledVendorsList.map((v) => v.displayName));
  const vendorFilterList: { id: string; name: string; isEnabled: boolean }[] = [];

  enabledVendorsList.forEach((v) => {
    vendorFilterList.push({ id: v.id, name: v.displayName, isEnabled: true });
  });
  (unassignedVendors || []).forEach((v) => {
    if (!enabledNames.has(v.displayName)) {
      vendorFilterList.push({ id: v.id, name: v.displayName, isEnabled: false });
    }
  });
  vendorFilterList.sort((a, b) => a.name.localeCompare(b.name));

  const enabledVendorIds = new Set(enabledVendorsList.map((v) => v.id));
  const enabledVendorNames = new Set(enabledVendorsList.map((v) => v.displayName));

  const filtered = masterItems
    .filter((i) => {
      const q = masterSearch.toLowerCase();
      const matchesSearch =
        i.displayName.toLowerCase().includes(q) ||
        (i.productCode && i.productCode.toLowerCase().includes(q)) ||
        (i.vendor && i.vendor.displayName.toLowerCase().includes(q));
      const matchesVendor = masterVendorFilter === 'all' || i.vendor?.displayName === masterVendorFilter;
      const isVendorEnabled = i.vendorId
        ? enabledVendorIds.has(i.vendorId)
        : (i.vendor as any)?.id
          ? enabledVendorIds.has((i.vendor as any).id)
          : i.vendor?.displayName
            ? enabledVendorNames.has(i.vendor.displayName)
            : false;

      return matchesSearch && matchesVendor && isVendorEnabled;
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedMasterIds.includes(i.id));

  const handleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = filtered.map((i) => i.id);
      setSelectedMasterIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      const filteredIds = filtered.map((i) => i.id);
      setSelectedMasterIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel modal-panel-lg" style={{ maxWidth: '800px', width: '90vw' }}>
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="modal-header">
          <h2>Enable Existing Catalog Products</h2>
          <p>
            Choose catalog items from the master catalog to make active for{' '}
            <strong>{locationName}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="Search products by name, SKU, or vendor..."
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
          />
          <select
            className="input"
            style={{ width: 'auto', minWidth: '180px' }}
            value={masterVendorFilter}
            onChange={(e) => setMasterVendorFilter(e.target.value)}
          >
            <option value="all">All Vendors</option>
            {vendorFilterList.map((v) => (
              <option key={v.id} value={v.name} disabled={!v.isEnabled}>
                {v.name}{!v.isEnabled ? ' (Disabled)' : ''}
              </option>
            ))}
          </select>
        </div>

        {masterLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Loading catalog items...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 16px',
              background: 'var(--bg-sunken, var(--bg-surface))',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-default)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
              {masterSearch || masterVendorFilter !== 'all' ? 'No matching products found' : 'All products are active'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {masterSearch || masterVendorFilter !== 'all'
                ? 'Try clearing filters or searching for a different product.'
                : `All catalog products are currently active at ${locationName}.`}
            </div>
          </div>
        ) : (
          <div>
            {/* Select All Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                marginBottom: '8px',
                background: 'var(--bg-sunken, var(--bg-surface))',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                fontSize: '13px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleSelectAllFiltered}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                Select All ({filtered.length} products)
              </label>
              {selectedMasterIds.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                  {selectedMasterIds.length} selected
                </span>
              )}
            </div>

            {/* Items List */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {filtered.map((item) => {
                const isSelected = selectedMasterIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    htmlFor={`master-item-${item.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--accent-subtle, rgba(235, 94, 40, 0.08))' : 'var(--bg-sunken, var(--bg-surface))',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        id={`master-item-${item.id}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectMaster(item.id)}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', display: 'block' }}>
                          {item.displayName}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          <span>SKU: <span className="mono">{item.productCode || '—'}</span></span>
                          <span>• Vendor: {item.vendor?.displayName || '—'}</span>
                          <span>• Unit: {item.displayUnitName || item.baseUnitName}</span>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {selectedMasterIds.length > 0 ? `${selectedMasterIds.length} item(s) selected` : 'Click items or checkboxes to select multiple.'}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedMasterIds.length > 0 && (
              <button
                type="button"
                onClick={handleEnableSelectedMaster}
                disabled={batchEnabling}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {batchEnabling ? 'Enabling...' : `Enable Selected (${selectedMasterIds.length})`}
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
