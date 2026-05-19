'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER';
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER'>('WORKER');
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Edit State
  const [editRole, setEditRole] = useState<'WORKER' | 'MANAGER' | 'ADMIN' | 'SUPER_MANAGER'>('WORKER');
  const [editFullName, setEditFullName] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

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
      });

      // Reset
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('WORKER');
      
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
      });
      
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user account.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user account?')) return;
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

        {/* Users list / table */}
        {loading ? (
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: '40px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
            <div className="skeleton" style={{ height: '32px', width: '100%' }} />
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
                    <th>Account Status</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id}>
                      <td style={{ paddingLeft: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.fullName}
                      </td>
                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.email}
                      </td>
                      <td>
                        <span className={`badge ${
                          item.role === 'ADMIN' ? 'badge-teal' :
                          item.role === 'SUPER_MANAGER' ? 'badge-amber' :
                          item.role === 'MANAGER' ? 'badge-teal' :
                          'badge-neutral'
                        }`}>
                          {item.role === 'SUPER_MANAGER' ? 'SUPER MGR' : item.role}
                        </span>
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
                              setError('');
                              setShowEditModal(true);
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          {item.isActive && (
                            <button
                              onClick={() => handleDeactivate(item.id)}
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
      </div>
    </AdminGuard>
  );
}
