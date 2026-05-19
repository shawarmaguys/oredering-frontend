'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Form State
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.locations.list();
      setLocations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setError('');

    try {
      await api.locations.create({ name, address, phone, email });
      setName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setShowModal(false);
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to create location.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;
    setFormSubmitting(true);
    setError('');

    try {
      await api.locations.update(selectedLocation.id, {
        name: editName,
        address: editAddress,
        phone: editPhone,
        email: editEmail,
      });
      setShowEditModal(false);
      setSelectedLocation(null);
      fetchLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to update location.');
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
          <span className="text-gray-900 dark:text-white font-medium">Locations</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Store Locations</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Register and manage active store locations.</p>
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
            Add Location
          </button>
        </div>

        {error && !showModal && !showEditModal && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Locations List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-4xl mb-4 block">📍</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Locations Yet</h3>
            <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              Get started by adding your first store location to the system.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl transition-all"
            >
              Add First Location
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-teal-500/30 dark:hover:border-teal-500/30 transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
                
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="p-2.5 bg-teal-50 dark:bg-teal-950/30 rounded-xl text-teal-600 dark:text-teal-400 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">{loc.name}</h3>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedLocation(loc);
                        setEditName(loc.name);
                        setEditAddress(loc.address);
                        setEditPhone(loc.phone);
                        setEditEmail(loc.email);
                        setError('');
                        setShowEditModal(true);
                      }}
                      className="relative z-10 p-2 border border-gray-200 dark:border-zinc-800 hover:border-teal-500 hover:bg-teal-500/5 text-gray-500 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400 rounded-xl transition-all text-xs font-bold shrink-0 flex items-center gap-1"
                      title="Edit Location"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      Edit
                    </button>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <p className="text-sm text-gray-500 dark:text-zinc-400 min-h-[40px] line-clamp-2">
                      {loc.address || 'No address provided'}
                    </p>
                    
                    <div className="flex flex-col gap-1.5 text-xs text-gray-400 dark:text-zinc-500 pt-3 border-t border-gray-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-500">📞 Phone:</span>
                        <span className="text-gray-700 dark:text-zinc-300 font-medium">{loc.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-500">✉️ Email:</span>
                        <span className="text-gray-700 dark:text-zinc-300 font-medium truncate">{loc.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 text-[10px] text-gray-400 flex justify-between items-center">
                  <span>ID: {loc.id.substring(0, 8)}...</span>
                  {loc.createdAt && <span>Added {new Date(loc.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Add form */}
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

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Add Store Location</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Enter details for the new store franchise.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. San Diego Downtown"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. +1 619-555-0100"
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
                      placeholder="e.g. downtown@shawarmaguys.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Address *
                  </label>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. 555 Broadway, San Diego, CA 92101"
                  />
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
                    {formSubmitting ? 'Creating...' : 'Save Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit form */}
        {showEditModal && selectedLocation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-fade-in-up">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLocation(null);
                }}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Edit Store Location</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Modify store profile details.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Address *
                  </label>
                  <textarea
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedLocation(null);
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
