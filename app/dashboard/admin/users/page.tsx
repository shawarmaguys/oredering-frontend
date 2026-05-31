'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER';
  isActive: boolean;
  createdAt: string;
  locationIds?: string[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER'>('WORKER');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit State
  const [editRole, setEditRole] = useState<'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER'>('WORKER');
  const [editFullName, setEditFullName] = useState('');

  // Deactivate confirmation state
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; fullName: string } | null>(null);

  // View / filter / sort state
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');

  useEffect(() => {
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await api.locations.list();
      setLocationsList(data);
    } catch (err: any) {
      console.error('Failed to load locations:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.users.list();

      const mapped = data.map((u: any) => ({
        id: u.id,
        fullName: u.full_name || u.fullName,
        email: u.email,
        role: u.role,
        isActive: u.is_active !== undefined ? u.is_active : u.isActive !== undefined ? u.isActive : true,
        createdAt: u.created_at || u.createdAt,
        locationIds: u.locationIds || []
      }));

      setUsers(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');

    try {
      await api.users.create({
        fullName: fullName,
        email,
        password,
        role,
        locationIds: selectedLocationIds
      });

      // Reset
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('WORKER');
      setSelectedLocationIds([]);

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormSubmitting(true);
    setError('');

    try {
      await api.users.update(selectedUser.id, {
        fullName: editFullName,
        role: editRole,
        locationIds: selectedLocationIds
      });

      setShowEditModal(false);
      setSelectedUser(null);
      setSelectedLocationIds([]);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivateClick = (id: string, fullName: string) => {
    setUserToDeactivate({ id, fullName });
    setDeactivateConfirmOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    const { id } = userToDeactivate;
    setDeactivateConfirmOpen(false);
    setUserToDeactivate(null);

    setError('');
    try {
      await api.users.delete(id);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user.');
    }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Users</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>User Accounts</h1>
            <p>Manage employee dashboard roles, system access credentials, and portal activity.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setSelectedLocationIds([]);
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Register Account
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Filter / Sort / View Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input className="input" style={{ paddingLeft: 32 }} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_MANAGER">Super Manager</option>
            <option value="MANAGER">Manager</option>
            <option value="WORKER">Worker</option>
          </select>
          <select className="input" style={{ flex: '0 0 auto', width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
            <option value="name">Sort: Name</option>
            <option value="date">Sort: Date Added</option>
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setViewMode('tile')} title="Tile view" style={{ padding: '8px 10px', background: viewMode === 'tile' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'tile' ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} title="List view" style={{ padding: '8px 10px', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-surface)', color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)', border: 'none', borderLeft: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Users list / table */}
        {loading ? (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: '40px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
          </div>
        ) : (
          (() => {
            const filtered = users
              .filter(u => {
                const q = search.toLowerCase();
                if (q && !u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
                if (roleFilter !== 'all' && u.role !== roleFilter) return false;
                return true;
              })
              .sort((a, b) => {
                if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
              });

            if (filtered.length === 0) return (
              <div className="card" style={{ padding: '48px 24px' }}>
                <div className="empty-state"><h3>No results found</h3><p>Try adjusting your search or filter.</p></div>
              </div>
            );

            return viewMode === 'tile' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: '24px'
              }} className="stagger">
                {filtered.map((item) => (
                  <div
                    key={item.id}
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
                            {item.fullName}
                          </h3>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }} className="mono">
                            {item.email}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className={`badge ${item.role === 'ADMIN' ? 'badge-teal' :
                              item.role === 'SUPER_MANAGER' ? 'badge-amber' :
                                item.role === 'MANAGER' ? 'badge-teal' :
                                  'badge-neutral'
                            }`}>
                            {item.role === 'SUPER_MANAGER' ? 'SUPER MGR' : item.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Status:</span>
                          <span className={`badge ${item.isActive ? 'badge-green' : 'badge-neutral'}`} style={{ padding: '2px 6px', fontSize: '0.6875rem' }}>
                            <span className="badge-dot" style={{ backgroundColor: item.isActive ? 'var(--green)' : 'var(--text-tertiary)' }} />
                            {item.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, width: '60px', flexShrink: 0 }}>Stores:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {item.locationIds && item.locationIds.length > 0 ? (
                              item.locationIds.map(locId => {
                                const loc = locationsList.find(l => l.id === locId);
                                return (
                                  <span key={locId} className="badge badge-neutral" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                                    {loc ? loc.name : 'Unknown Store'}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                                {item.role === 'ADMIN' ? 'All Locations (Admin)' : 'No Locations'}
                              </span>
                            )}
                          </div>
                        </div>
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
                      <span className="mono">ID: {item.id.substring(0, 8)}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedUser(item);
                            setEditFullName(item.fullName);
                            setEditRole(item.role);
                            setSelectedLocationIds(item.locationIds || []);
                            setError('');
                            setShowEditModal(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 12, height: 12, marginRight: '4px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                          Edit
                        </button>
                        {item.isActive && (
                          <button
                            onClick={() => handleDeactivateClick(item.id, item.fullName)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card animate-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: '24px' }}>Full Name</th>
                        <th>Email Address</th>
                        <th>Assigned Role</th>
                        <th>Assigned Store Locations</th>
                        <th>Account Status</th>
                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => (
                        <tr key={item.id}>
                          <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.fullName}
                          </td>
                          <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {item.email}
                          </td>
                          <td>
                            <span className={`badge ${item.role === 'ADMIN' ? 'badge-teal' :
                                item.role === 'SUPER_MANAGER' ? 'badge-amber' :
                                  item.role === 'MANAGER' ? 'badge-teal' :
                                    'badge-neutral'
                              }`}>
                              {item.role === 'SUPER_MANAGER' ? 'SUPER MGR' : item.role}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {item.locationIds && item.locationIds.length > 0 ? (
                                item.locationIds.map(locId => {
                                  const loc = locationsList.find(l => l.id === locId);
                                  return (
                                    <span key={locId} className="badge badge-neutral" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
                                      {loc ? loc.name : 'Unknown Store'}
                                    </span>
                                  );
                                })
                              ) : (
                                <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                                  {item.role === 'ADMIN' ? 'All Locations (Admin)' : 'No Locations Assigned'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${item.isActive ? 'badge-green' : 'badge-neutral'}`}>
                              <span className="badge-dot" style={{ backgroundColor: item.isActive ? 'var(--green)' : 'var(--text-tertiary)' }} />
                              {item.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setSelectedUser(item);
                                  setEditFullName(item.fullName);
                                  setEditRole(item.role);
                                  setSelectedLocationIds(item.locationIds || []);
                                  setError('');
                                  setShowEditModal(true);
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Edit
                              </button>
                              {item.isActive && (
                                <button
                                  onClick={() => handleDeactivateClick(item.id, item.fullName)}
                                  className="btn btn-danger btn-sm"
                                >
                                  Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()
        )}

        {/* Modal Register Form */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-sm">
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
                <h2>Register Account</h2>
                <p>Register a secure dashboard login for new personnel and assign operations clearance.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label" htmlFor="user-name">Full Name *</label>
                  <input
                    id="user-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="user-email">Email Address *</label>
                  <input
                    id="user-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="johndoe@shawarmaguys.com"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="user-pass">Password *</label>
                  <input
                    id="user-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="user-role">Operations Role *</label>
                  <select
                    id="user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="input"
                  >
                    <option value="WORKER">Worker (Perform Stock Takes)</option>
                    <option value="MANAGER">Manager (Approve Orders)</option>
                    <option value="ADMIN">System Administrator (Full access)</option>
                    <option value="SUPER_MANAGER">Super Manager (Advanced Ops)</option>
                  </select>
                </div>

                {role !== 'ADMIN' && (
                  <div>
                    <label className="label">Assigned store locations</label>
                    <div style={{
                      maxHeight: '130px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      backgroundColor: 'var(--bg-sunken)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {locationsList.map((loc) => {
                        const isChecked = selectedLocationIds.includes(loc.id);
                        return (
                          <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLocationIds((prev) => [...prev, loc.id]);
                                } else {
                                  setSelectedLocationIds((prev) => prev.filter((id) => id !== loc.id));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            {loc.name}
                          </label>
                        );
                      })}
                      {locationsList.length === 0 && (
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>No locations registered in system.</span>
                      )}
                    </div>
                  </div>
                )}

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
                    {formSubmitting ? 'Registering...' : 'Register User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Form */}
        {showEditModal && selectedUser && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-sm">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Edit Account Settings</h2>
                <p>Modify staff profile name or change operations portal privilege levels.</p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label" htmlFor="edit-user-name">Full Name *</label>
                  <input
                    id="edit-user-name"
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="edit-user-email">Email Address (Read-only)</label>
                  <input
                    id="edit-user-email"
                    type="text"
                    disabled
                    value={selectedUser.email}
                    className="input font-mono"
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="edit-user-role">Operations Role *</label>
                  <select
                    id="edit-user-role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="input"
                  >
                    <option value="WORKER">Worker (Perform Stock Takes)</option>
                    <option value="MANAGER">Manager (Approve Orders)</option>
                    <option value="ADMIN">System Administrator (Full access)</option>
                    <option value="SUPER_MANAGER">Super Manager (Advanced Ops)</option>
                  </select>
                </div>

                {editRole !== 'ADMIN' && (
                  <div>
                    <label className="label">Assigned store locations</label>
                    <div style={{
                      maxHeight: '130px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      backgroundColor: 'var(--bg-sunken)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {locationsList.map((loc) => {
                        const isChecked = selectedLocationIds.includes(loc.id);
                        return (
                          <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLocationIds((prev) => [...prev, loc.id]);
                                } else {
                                  setSelectedLocationIds((prev) => prev.filter((id) => id !== loc.id));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            {loc.name}
                          </label>
                        );
                      })}
                      {locationsList.length === 0 && (
                        <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>No locations registered in system.</span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
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
          isOpen={deactivateConfirmOpen}
          title="Deactivate Account?"
          message={`Are you sure you want to deactivate ${userToDeactivate?.fullName}'s user account?`}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => {
            setDeactivateConfirmOpen(false);
            setUserToDeactivate(null);
          }}
        />
      </div>
    </AdminGuard>
  );
}
