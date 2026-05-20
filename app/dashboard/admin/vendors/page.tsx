'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface Vendor {
  id: string;
  displayName: string;
  channelName?: string;
  email?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  phone?: string;
  departmentId: string;
  department?: {
    id: string;
    code: string;
    fullName: string;
  };
  createdAt: string;
}

interface Department {
  id: string;
  code: string;
  fullName: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Onboard (Create) Form State
  const [displayName, setDisplayName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Form State
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editChannelName, setEditChannelName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress1, setEditAddress1] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editAddress3, setEditAddress3] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vendorsData, deptsData] = await Promise.all([
        api.vendors.list(),
        api.vendors.departments(),
      ]);
      setVendors(vendorsData);
      setDepartments(deptsData);
      if (deptsData.length > 0) {
        setDepartmentId(deptsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load initial vendor data.');
    } finally {
      setLoading(false);
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
        phone: phone || undefined,
        address1: address1 || undefined,
        address2: address2 || undefined,
        address3: address3 || undefined,
        departmentId,
      });

      // Reset
      setDisplayName('');
      setChannelName('');
      setEmail('');
      setPhone('');
      setAddress1('');
      setAddress2('');
      setAddress3('');
      if (departments.length > 0) {
        setDepartmentId(departments[0].id);
      }

      setShowModal(false);

      // Re-fetch list
      const vendorsData = await api.vendors.list();
      setVendors(vendorsData);
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
        phone: editPhone || null,
        address1: editAddress1 || null,
        address2: editAddress2 || null,
        address3: editAddress3 || null,
        departmentId: editDepartmentId,
      });

      setShowEditModal(false);
      setSelectedVendor(null);

      // Re-fetch list
      const vendorsData = await api.vendors.list();
      setVendors(vendorsData);
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setVendorToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    const { id } = vendorToDelete;
    setDeleteConfirmOpen(false);
    setVendorToDelete(null);

    setLoading(true);
    setError('');
    try {
      await api.vendors.delete(id);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor.');
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <button
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

        {error && !showModal && !showEditModal && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Vendors Grid */}
        {loading ? (
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
        ) : vendors.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.11a2.25 2.25 0 00-2.247-2.112H18M18 10.5V4.5A2.25 2.25 0 0015.75 2.25H12M8.25 10.5h11.25M8.25 10.5v1.5a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25v-1.5M3 10.5h.008v.008H3v-.008zm3 0h.008v.008H6v-.008z" />
                </svg>
              </div>
              <h3>No vendors onboarded</h3>
              <p>Onboard your food, beverage, and packaging wholesale vendors to configure purchase order channels.</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Onboard First Supplier
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '24px'
          }} className="stagger">
            {vendors.map((vendor) => (
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setSelectedVendor(vendor);
                          setEditDisplayName(vendor.displayName);
                          setEditChannelName(vendor.channelName || '');
                          setEditEmail(vendor.email || '');
                          setEditPhone(vendor.phone || '');
                          setEditAddress1(vendor.address1 || '');
                          setEditAddress2(vendor.address2 || '');
                          setEditAddress3(vendor.address3 || '');
                          setEditDepartmentId(vendor.departmentId);
                          setError('');
                          setShowEditModal(true);
                        }}
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
                        onClick={() => handleDeleteClick(vendor.id, vendor.displayName)}
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
        )}

        {/* Modal Onboarding Form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg">
              <button
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

                <div>
                  <label className="label" htmlFor="vendor-email">Contact Email Address</label>
                  <input
                    id="vendor-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="orders@syscowholesale.com"
                  />
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

                <div>
                  <label className="label" htmlFor="edit-vendor-email">Contact Email Address</label>
                  <input
                    id="edit-vendor-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="input"
                  />
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

        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          title="Delete Vendor?"
          message={`Are you sure you want to delete "${vendorToDelete?.name}"? This will delete all products, schedules, stock records, and purchase orders associated with this vendor.`}
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
