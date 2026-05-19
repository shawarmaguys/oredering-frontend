'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

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

  return (
    <AdminGuard>
      <div className="space-y-6 animate-fade-in-up">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">Vendors</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Vendors & Suppliers</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Manage wholesale vendors, channels, and contacts.</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Onboard Vendor
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Vendors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-4xl mb-4 block">🚚</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Vendors Onboarded</h3>
            <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              Onboard your food, beverage, and packaging wholesale vendors to configure purchase order channels.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl transition-all"
            >
              Onboard First Supplier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />

                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div className="truncate">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{vendor.displayName}</h3>
                      {vendor.department && (
                        <span className="inline-block mt-1 px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-500/10">
                          {vendor.department.code}
                        </span>
                      )}
                    </div>

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
                      className="relative z-10 p-2 border border-gray-200 dark:border-zinc-800 hover:border-teal-500 hover:bg-teal-500/5 text-gray-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 rounded-xl transition-all text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Edit Vendor"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      Edit
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-gray-500 dark:text-zinc-400 mb-6">
                    {vendor.department && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-400">Dept:</span>
                        <span>{vendor.department.fullName}</span>
                      </div>
                    )}
                    {vendor.channelName && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-400">Slack:</span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-mono rounded">
                          #{vendor.channelName}
                        </span>
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-400">Email:</span>
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-400">Phone:</span>
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.address1 && (
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-400">Addr:</span>
                        <span className="line-clamp-2">
                          {[vendor.address1, vendor.address2, vendor.address3].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 flex justify-between items-center">
                  <span>ID: {vendor.id.substring(0, 8)}...</span>
                  {vendor.createdAt && <span>Onboarded {new Date(vendor.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Onboarding Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in-up">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Onboard New Vendor</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Add a wholesale vendor and supplier details.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. Sysco Wholesale"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Department Type *
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Slack Channel Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">#</span>
                      <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="sysco-orders"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. +1 619-555-0199"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Contact Email Address
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="orders@syscowholesale.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Supplier Street Address (Line 1)
                  </label>
                  <input
                    type="text"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 100 Supply Chain Way"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Suite/Bldg (Line 2)
                    </label>
                    <input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. Suite 400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      City, State, Zip (Line 3)
                    </label>
                    <input
                      type="text"
                      value={address3}
                      onChange={(e) => setAddress3(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. San Diego, CA 92121"
                    />
                  </div>
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
                    {formSubmitting ? 'Onboarding...' : 'Onboard Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Form */}
        {showEditModal && selectedVendor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in-up">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedVendor(null);
                }}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Edit Onboarded Vendor</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Modify supplier profile details and departments.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Department Type *
                    </label>
                    <select
                      value={editDepartmentId}
                      onChange={(e) => setEditDepartmentId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.fullName} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Slack Channel Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">#</span>
                      <input
                        type="text"
                        value={editChannelName}
                        onChange={(e) => setEditChannelName(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Contact Email Address
                  </label>
                  <input
                    type="text"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Supplier Street Address (Line 1)
                  </label>
                  <input
                    type="text"
                    value={editAddress1}
                    onChange={(e) => setEditAddress1(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Suite/Bldg (Line 2)
                    </label>
                    <input
                      type="text"
                      value={editAddress2}
                      onChange={(e) => setEditAddress2(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      City, State, Zip (Line 3)
                    </label>
                    <input
                      type="text"
                      value={editAddress3}
                      onChange={(e) => setEditAddress3(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedVendor(null);
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
