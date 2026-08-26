'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useVendors, Vendor } from '../../../context/VendorsContext';
import { useLocations } from '../../../context/LocationsContext';
import { useLocationFilter } from '../../../context/LocationFilterContext';
import { useAuth } from '../../../context/AuthContext';
import { useItems } from '../../../context/ItemsContext';

// Vendor and Department types are imported from VendorsContext

export default function VendorsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_MANAGER';

  const { vendors, departments, vendorsLoading: loading, refreshVendors } = useVendors();
  const { refreshAllItems } = useItems();
  const { locations } = useLocations();
  const { selectedLocationId } = useLocationFilter();

  const activeLocationObj = locations.find((l) => l.id === selectedLocationId);

  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [email, setEmail] = useState('');
  const [otherEmails, setOtherEmails] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [vendorSortColumn, setVendorSortColumn] = useState<'name' | 'dept' | 'slack' | 'email' | 'phone' | 'createdAt'>('name');
  const [vendorSortDir, setVendorSortDir] = useState<'asc' | 'desc'>('asc');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Form State
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editChannelName, setEditChannelName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOtherEmails, setEditOtherEmails] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress1, setEditAddress1] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editAddress3, setEditAddress3] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<{ id: string; name: string; isLastLocation: boolean } | null>(null);

  // Enable existing vendors modal state
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [masterVendors, setMasterVendors] = useState<Vendor[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [batchEnabling, setBatchEnabling] = useState(false);

  const openEnableModal = async (locId?: string) => {
    setShowEnableModal(true);
    setMasterLoading(true);
    setSelectedVendorIds([]);
    setMasterSearch('');
    const defaultLoc = locId || (selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : (locations[0]?.id || ''));
    setTargetLocationId(defaultLoc);
    try {
      const data = await api.vendors.listUnassigned(defaultLoc);
      setMasterVendors(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load available vendors.');
    } finally {
      setMasterLoading(false);
    }
  };

  const handleTargetLocationChange = async (newLocId: string) => {
    setTargetLocationId(newLocId);
    setSelectedVendorIds([]);
    setMasterLoading(true);
    try {
      const data = await api.vendors.listUnassigned(newLocId);
      setMasterVendors(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load available vendors.');
    } finally {
      setMasterLoading(false);
    }
  };

  const handleToggleSelectVendor = (vendorId: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleEnableSelectedVendors = async () => {
    if (selectedVendorIds.length === 0 || !targetLocationId) return;
    setBatchEnabling(true);
    try {
      await Promise.all(
        selectedVendorIds.map((vendorId) =>
          api.vendors.assignToLocation(vendorId, targetLocationId)
        )
      );
      setMasterVendors((prev) => prev.filter((v) => !selectedVendorIds.includes(v.id)));
      setSelectedVendorIds([]);
      await refreshVendors();
      await refreshAllItems();
    } catch (err: any) {
      setError(err?.message || 'Failed to enable selected vendors.');
    } finally {
      setBatchEnabling(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');

    try {
      await api.vendors.create({
        displayName,
        channelName: channelName || undefined,
        email: email || undefined,
        otherEmails: otherEmails || undefined,
        phone: phone || undefined,
        address1: address1 || undefined,
        address2: address2 || undefined,
        address3: address3 || undefined,
        departmentId,
        locationId: selectedLocationId,
      });

      // Reset
      setDisplayName('');
      setChannelName('');
      setEmail('');
      setOtherEmails('');
      setPhone('');
      setAddress1('');
      setAddress2('');
      setAddress3('');
      if (departments.length > 0) {
        setDepartmentId(departments[0].id);
      }

      setShowModal(false);
      await refreshVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to onboard vendor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setFormSubmitting(true);
    setError('');

    try {
      await api.vendors.update(selectedVendor.id, {
        displayName: editDisplayName,
        channelName: editChannelName || null,
        email: editEmail || null,
        otherEmails: editOtherEmails || null,
        phone: editPhone || null,
        address1: editAddress1 || null,
        address2: editAddress2 || null,
        address3: editAddress3 || null,
        departmentId: editDepartmentId,
      });

      setShowEditModal(false);
      setSelectedVendor(null);
      await refreshVendors();
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setEditDisplayName(vendor.displayName);
    setEditChannelName(vendor.channelName || '');
    setEditEmail(vendor.email || '');
    setEditOtherEmails(vendor.otherEmails || '');
    setEditPhone(vendor.phone || '');
    setEditAddress1(vendor.address1 || '');
    setEditAddress2(vendor.address2 || '');
    setEditAddress3(vendor.address3 || '');
    setEditDepartmentId(vendor.departmentId);
    setError('');
    setShowEditModal(true);
  };

  const handleDeleteClick = (id: string, name: string, assignedLocationCount?: number) => {
    const isLast = assignedLocationCount !== undefined ? assignedLocationCount <= 1 : true;
    setVendorToDelete({ id, name, isLastLocation: isLast });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    const { id } = vendorToDelete;
    setDeleteConfirmOpen(false);
    setVendorToDelete(null);
    setError('');
    try {
      await api.vendors.delete(id, selectedLocationId);
      await refreshVendors();
      await refreshAllItems();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor.');
    }
  };

  return (
    <AdminGuard>
      <div className="page-container">
        {/* Pinned Top Bar */}
        <div className="page-header-sticky">
          {/* Navigation Breadcrumbs */}
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Vendors</span>
          </div>

          {/* Header */}
          <div className="page-header">
            <div className="page-header-text">
              <h1>Vendors & Suppliers</h1>
              <p>Manage wholesale vendor accounts, Slack channels, and contact information.</p>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    openEnableModal();
                  }}
                  className="btn btn-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Enable Existing Vendors
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowModal(true);
                  }}
                  className="btn btn-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Onboard Vendor
                </button>
              </div>
            )}
          </div>

          {error && !showModal && !showEditModal && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Filter / Sort / View Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>

            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button type="button" onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              </button>
              <button type="button" onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        {loading ? (
          <div className="page-content-scroll">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '24px'
            }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse" style={{ padding: '24px', height: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div className="skeleton" style={{ height: '16px', width: '60%' }} />
                      <div className="skeleton" style={{ height: '12px', width: '40%' }} />
                    </div>
                  </div>
                  <div className="skeleton" style={{ height: '12px', width: '80%' }} />
                  <div className="skeleton" style={{ height: '12px', width: '50%' }} />
                </div>
              ))}
            </div>
          </div>
        ) : vendors.length === 0 ? (
          <div className="page-content-scroll">
            <div className="card" style={{ padding: '48px 24px' }}>
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.11a2.25 2.25 0 00-2.247-2.112H18M18 10.5V4.5A2.25 2.25 0 0015.75 2.25H12M8.25 10.5h11.25M8.25 10.5v1.5a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25v-1.5M3 10.5h.008v.008H3v-.008zm3 0h.008v.008H6v-.008z" />
                  </svg>
                </div>
                <h3>No vendors onboarded</h3>
                <p>Onboard your food, beverage, and packaging wholesale vendors to configure purchase order channels.</p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary"
                  >
                    Onboard First Supplier
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const filtered = vendors
              .filter(v => {
                const q = search.toLowerCase();
                if (q && !v.displayName.toLowerCase().includes(q) && !v.email?.toLowerCase().includes(q) && !v.channelName?.toLowerCase().includes(q)) return false;
                if (departmentFilter !== 'all' && v.departmentId !== departmentFilter) return false;
                return true;
              })
              .sort((a, b) => {
                let valA: any = '';
                let valB: any = '';
                if (vendorSortColumn === 'name') { valA = a.displayName || ''; valB = b.displayName || ''; }
                else if (vendorSortColumn === 'dept') { valA = a.department?.fullName || ''; valB = b.department?.fullName || ''; }
                else if (vendorSortColumn === 'slack') { valA = a.channelName || ''; valB = b.channelName || ''; }
                else if (vendorSortColumn === 'email') { valA = a.email || ''; valB = b.email || ''; }
                else if (vendorSortColumn === 'phone') { valA = a.phone || ''; valB = b.phone || ''; }
                else if (vendorSortColumn === 'createdAt') {
                  valA = new Date(a.createdAt).getTime();
                  valB = new Date(b.createdAt).getTime();
                }
                if (typeof valA === 'string') {
                  return vendorSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return vendorSortDir === 'asc' ? valA - valB : valB - valA;
              });

            if (filtered.length === 0) return (
              <div className="page-content-scroll">
                <div className="card" style={{ padding: '48px 24px' }}>
                  <div className="empty-state"><h3>No results found</h3><p>Try adjusting your search or filter.</p></div>
                </div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div className="page-content-scroll">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                  gap: '24px'
                }} className="stagger">
                {filtered.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="card card-hover"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '20px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {vendor.displayName}
                          </h3>
                          {vendor.department && (
                            <span className="badge badge-teal" style={{ marginTop: '6px' }}>
                              {vendor.department.code}
                            </span>
                          )}
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(vendor)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                              title="Edit Vendor"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(vendor.id, vendor.displayName, vendor.locationVendors?.length)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', color: '#ef4444', borderColor: '#fca5a5' }}
                              title="Delete Vendor"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                        {vendor.department && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '48px', flexShrink: 0 }}>Dept:</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{vendor.department.fullName}</span>
                          </div>
                        )}
                        {vendor.channelName && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '48px', flexShrink: 0 }}>Slack:</span>
                            <span className="mono" style={{
                              color: 'var(--accent)',
                              backgroundColor: 'var(--accent-subtle)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--accent-border)',
                              fontSize: '0.75rem'
                            }}>
                              #{vendor.channelName}
                            </span>
                          </div>
                        )}
                        {vendor.email && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '48px', flexShrink: 0 }}>Email:</span>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '48px', flexShrink: 0 }}>Phone:</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{vendor.phone}</span>
                          </div>
                        )}
                        {vendor.address1 && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '48px', flexShrink: 0 }}>Addr:</span>
                            <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }} className="line-clamp-2">
                              {[vendor.address1, vendor.address2, vendor.address3].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.6875rem',
                      color: 'var(--text-tertiary)'
                    }}>
                      <span className="mono">ID: {vendor.id.substring(0, 8)}</span>
                      {vendor.createdAt && <span>Added {new Date(vendor.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
                </div>
              </div>
            ) : (
              <div className="table-scroll-container">
                <div className="table-responsive-wrap">
                  <table className="data-table">
                    <thead><tr>
                      <th style={{ paddingLeft: 24, cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'name') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('name'); setVendorSortDir('asc'); } }}>
                        Name {vendorSortColumn === 'name' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'dept') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('dept'); setVendorSortDir('asc'); } }}>
                        Dept {vendorSortColumn === 'dept' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'slack') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('slack'); setVendorSortDir('asc'); } }}>
                        Slack {vendorSortColumn === 'slack' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'email') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('email'); setVendorSortDir('asc'); } }}>
                        Email {vendorSortColumn === 'email' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'phone') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('phone'); setVendorSortDir('asc'); } }}>
                        Phone {vendorSortColumn === 'phone' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => { if (vendorSortColumn === 'createdAt') setVendorSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVendorSortColumn('createdAt'); setVendorSortDir('asc'); } }}>
                        Added {vendorSortColumn === 'createdAt' ? (vendorSortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      {isAdmin && <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>}
                    </tr></thead>
                    <tbody>
                      {filtered.map(vendor => (
                        <tr key={vendor.id}>
                          <td style={{ paddingLeft: 24, fontWeight: 600, color: 'var(--text-primary)' }}>{vendor.displayName}</td>
                          <td>{vendor.department ? <span className="badge badge-teal">{vendor.department.code}</span> : '—'}</td>
                          <td>{vendor.channelName ? <span className="mono" style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-subtle)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--accent-border)', fontSize: '0.75rem' }}>#{vendor.channelName}</span> : '—'}</td>
                          <td>{vendor.email || '—'}</td>
                          <td>{vendor.phone || '—'}</td>
                          <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '—'}</td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right', paddingRight: 24 }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(vendor)}>Edit</button>
                                <button type="button" className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleDeleteClick(vendor.id, vendor.displayName, vendor.locationVendors?.length)}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}



        {/* Modal Onboarding Form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Onboard New Vendor</h2>
                <p>Register a wholesale distributor to configure automatic purchase order dispatch channels.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="vendor-name">Display Name *</label>
                    <input
                      id="vendor-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="input"
                      placeholder="e.g. Sysco Wholesale"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="vendor-dept">Department Type *</label>
                    <select
                      id="vendor-dept"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="input"
                    >
                      {departments.length === 0 ? (
                        <option value="">No departments available</option>
                      ) : (
                        departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.fullName} ({dept.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="vendor-slack">Slack Channel Name</label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix">#</span>
                      <input
                        id="vendor-slack"
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        className="input"
                        placeholder="sysco-orders"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="vendor-phone">Contact Phone</label>
                    <input
                      id="vendor-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input"
                      placeholder="+1 (619) 555-0199"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="vendor-email">Default Email Address(es)</label>
                    <input
                      id="vendor-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="orders@syscowholesale.com"
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                      Auto-selected when sending a PO.
                    </span>
                  </div>

                  <div>
                    <label className="label" htmlFor="vendor-other-emails">Other Email Address(es)</label>
                    <input
                      id="vendor-other-emails"
                      type="text"
                      value={otherEmails}
                      onChange={(e) => setOtherEmails(e.target.value)}
                      className="input"
                      placeholder="billing@syscowholesale.com, rep@sysco.com"
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                      User can manually select when sending a PO.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="vendor-address-1">Supplier Street Address (Line 1)</label>
                  <input
                    id="vendor-address-1"
                    type="text"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="input"
                    placeholder="100 Supply Chain Way"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="vendor-address-2">Suite/Bldg (Line 2)</label>
                    <input
                      id="vendor-address-2"
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      className="input"
                      placeholder="Suite 400"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="vendor-address-3">City, State, Zip (Line 3)</label>
                    <input
                      id="vendor-address-3"
                      type="text"
                      value={address3}
                      onChange={(e) => setAddress3(e.target.value)}
                      className="input"
                      placeholder="San Diego, CA 92121"
                    />
                  </div>
                </div>



                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {formSubmitting ? 'Onboarding...' : 'Onboard Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Form */}
        {showEditModal && selectedVendor && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVendor(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Edit Onboarded Vendor</h2>
                <p>Modify supplier contact channels, dispatch endpoints, and departments.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-vendor-name">Display Name *</label>
                    <input
                      id="edit-vendor-name"
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-vendor-dept">Department Type *</label>
                    <select
                      id="edit-vendor-dept"
                      value={editDepartmentId}
                      onChange={(e) => setEditDepartmentId(e.target.value)}
                      className="input"
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.fullName} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-vendor-slack">Slack Channel Name</label>
                    <div className="input-prefix-wrap">
                      <span className="input-prefix">#</span>
                      <input
                        id="edit-vendor-slack"
                        type="text"
                        value={editChannelName}
                        onChange={(e) => setEditChannelName(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-vendor-phone">Contact Phone</label>
                    <input
                      id="edit-vendor-phone"
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-vendor-email">Default Email Address(es)</label>
                    <input
                      id="edit-vendor-email"
                      type="text"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="input"
                      placeholder="orders@syscowholesale.com"
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                      Auto-selected when sending a PO.
                    </span>
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-vendor-other-emails">Other Email Address(es)</label>
                    <input
                      id="edit-vendor-other-emails"
                      type="text"
                      value={editOtherEmails}
                      onChange={(e) => setEditOtherEmails(e.target.value)}
                      className="input"
                      placeholder="billing@syscowholesale.com, rep@sysco.com"
                    />
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                      User can manually select when sending a PO.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="edit-vendor-address-1">Supplier Street Address (Line 1)</label>
                  <input
                    id="edit-vendor-address-1"
                    type="text"
                    value={editAddress1}
                    onChange={(e) => setEditAddress1(e.target.value)}
                    className="input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-vendor-address-2">Suite/Bldg (Line 2)</label>
                    <input
                      id="edit-vendor-address-2"
                      type="text"
                      value={editAddress2}
                      onChange={(e) => setEditAddress2(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-vendor-address-3">City, State, Zip (Line 3)</label>
                    <input
                      id="edit-vendor-address-3"
                      type="text"
                      value={editAddress3}
                      onChange={(e) => setEditAddress3(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>



                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedVendor(null);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {formSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* Enable Existing Vendors Modal */}
        {showEnableModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg" style={{ maxWidth: '680px' }}>
              <button
                type="button"
                onClick={() => setShowEnableModal(false)}
                className="modal-close"
              >
                &times;
              </button>

              <div className="modal-header">
                <h2>Enable Existing Suppliers</h2>
                <p>
                  Assign onboarded master suppliers to{' '}
                  <strong>{activeLocationObj?.name || 'this location'}</strong>.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    style={{
                      width: 15,
                      height: 15,
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    className="input"
                    style={{ paddingLeft: 36, width: '100%', borderRadius: 'var(--radius-md)' }}
                    placeholder="Search available vendors to enable..."
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* List */}
              {masterLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div className="animate-spin" style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: 8 }} />
                  <div>Loading master vendors...</div>
                </div>
              ) : (
                (() => {
                  const availableToEnable = masterVendors.filter((v) => {
                    const q = masterSearch.toLowerCase();
                    return !q || v.displayName.toLowerCase().includes(q) || v.department?.fullName.toLowerCase().includes(q);
                  });

                  if (availableToEnable.length === 0) {
                    const activeTargetLocObj = locations.find((l) => l.id === targetLocationId);
                    return (
                      <div
                        style={{
                          padding: '40px 20px',
                          textAlign: 'center',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-default)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 22, height: 22 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                            {masterSearch ? 'No matching vendors found' : 'All vendors are enabled'}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {masterSearch
                              ? 'Try searching for a different supplier name or department.'
                              : `All onboarded suppliers in the system are currently active for ${activeTargetLocObj?.name || 'this location'}.`}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const allFilteredSelected = availableToEnable.length > 0 && availableToEnable.every((v) => selectedVendorIds.includes(v.id));

                  const handleSelectAllFiltered = () => {
                    if (allFilteredSelected) {
                      const filteredIds = availableToEnable.map((v) => v.id);
                      setSelectedVendorIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                    } else {
                      const filteredIds = availableToEnable.map((v) => v.id);
                      setSelectedVendorIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                    }
                  };

                  return (
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
                          Select All ({availableToEnable.length} vendors)
                        </label>
                        {selectedVendorIds.length > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                            {selectedVendorIds.length} selected
                          </span>
                        )}
                      </div>

                      {/* Items List */}
                      <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {availableToEnable.map((v) => {
                          const isSelected = selectedVendorIds.includes(v.id);
                          return (
                            <div
                              key={v.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleSelectVendor(v.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleToggleSelectVendor(v.id);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                borderRadius: 'var(--radius-md)',
                                background: isSelected ? 'var(--accent-subtle, rgba(235, 94, 40, 0.08))' : 'var(--bg-sunken, var(--bg-surface))',
                                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div onClick
                                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                                />
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--accent-glow, rgba(99, 102, 241, 0.1))',
                                    color: 'var(--accent)',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                  }}
                                >
                                  {v.displayName.substring(0, 2)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{v.displayName}</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="badge" style={{ padding: '2px 6px', fontSize: '11px' }}>{v.department?.fullName || 'General'}</span>
                                    {v.channelName && <span>• #{v.channelName}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selectedVendorIds.length > 0 ? `${selectedVendorIds.length} vendor(s) selected` : 'Click vendors or checkboxes to select multiple.'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedVendorIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEnableSelectedVendors}
                      disabled={batchEnabling}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      {batchEnabling ? 'Enabling...' : `Enable Selected (${selectedVendorIds.length})`}
                    </button>
                  )}
                  <button type="button" onClick={() => setShowEnableModal(false)} className="btn btn-secondary" style={{ padding: '8px 20px', fontWeight: 600 }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Remove Vendor from Location"
          message={`Are you sure you want to remove "${vendorToDelete?.name}" from ${activeLocationObj?.name || 'this location'}?`}
          warningMessage={
            vendorToDelete?.isLastLocation
              ? `This vendor is ONLY assigned to ${activeLocationObj?.name || 'this location'}. Removing it will deactivate it globally and remove it from the system.`
              : undefined
          }
          confirmText={vendorToDelete?.isLastLocation ? "Deactivate & Remove Vendor" : "Remove Vendor"}
          confirmVariant={vendorToDelete?.isLastLocation ? "danger" : "primary"}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setVendorToDelete(null);
          }}
        />
      </div>
    </AdminGuard>
  );
}
