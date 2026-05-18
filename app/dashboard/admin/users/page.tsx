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
      
      // Map API response fields to matches interface fields if casing differs
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
        full_name: fullName,
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
        full_name: editFullName,
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
      <div className="space-y-6 animate-fade-in-up">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Users</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">User Accounts</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Manage staff roles, permissions, and status.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Register Account
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Users list / grid */}
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55/50 dark:bg-zinc-800/40 text-gray-500 dark:text-zinc-400 font-semibold text-sm border-b border-gray-200 dark:border-zinc-800">
                    <th className="p-4 pl-6">Full Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/50">
                  {users.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors text-sm text-gray-700 dark:text-zinc-300"
                    >
                      <td className="p-4 pl-6 font-bold text-gray-900 dark:text-white">
                        {item.fullName}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {item.email}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          item.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                          item.role === 'SUPER_MANAGER' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                          item.role === 'MANAGER' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                          'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.isActive
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-red-550'}`} />
                          {item.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(item);
                            setEditFullName(item.fullName);
                            setEditRole(item.role);
                            setError('');
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 hover:border-teal-500 dark:hover:border-teal-500 text-gray-600 dark:text-gray-300 font-bold rounded-lg text-xs transition-all"
                        >
                          Edit
                        </button>
                        {item.isActive && (
                          <button
                            onClick={() => handleDeactivate(item.id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-550 text-red-600 dark:text-red-400 hover:text-white dark:hover:text-teal-950 font-bold rounded-lg text-xs transition-all"
                          >
                            Deactivate
                          </button>
                        )}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Register Account</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Create a login account for restaurant employees.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="johndoe@shawarmaguys.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Access Permission Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="WORKER">Worker (Perform Stock Takes)</option>
                    <option value="MANAGER">Manager (Approve Orders)</option>
                    <option value="ADMIN">System Administrator (Full access)</option>
                    <option value="SUPER_MANAGER">Super Manager (Advanced Ops)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Edit Account</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Modify user profile fields or permission level.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedUser.email}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800/30 text-gray-400 dark:text-zinc-500 cursor-not-allowed font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Access Permission Role *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="WORKER">Worker (Perform Stock Takes)</option>
                    <option value="MANAGER">Manager (Approve Orders)</option>
                    <option value="ADMIN">System Administrator (Full access)</option>
                    <option value="SUPER_MANAGER">Super Manager (Advanced Ops)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 py-3 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                  >
                    {formSubmitting ? 'Updating...' : 'Save Changes'}
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
