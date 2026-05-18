'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface Vendor {
  id: string;
  displayName: string;
}

interface Item {
  id: string;
  displayName: string;
  baseUnitName: string;
  displayUnitName: string;
  multiplier: number;
  isActive: boolean;
  vendorId: string;
  vendor?: {
    displayName: string;
  };
  createdAt: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [baseUnitName, setBaseUnitName] = useState('');
  const [displayUnitName, setDisplayUnitName] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsData, vendorsData] = await Promise.all([
        api.items.list(),
        api.vendors.list(),
      ]);
      setItems(itemsData);
      setVendors(vendorsData);
      if (vendorsData.length > 0) {
        setVendorId(vendorsData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load initial data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) {
      setError('Please select a vendor first.');
      return;
    }
    setFormSubmitting(true);
    setError('');

    try {
      await api.items.create({
        displayName,
        vendorId,
        baseUnitName,
        displayUnitName,
        multiplier: Number(multiplier),
      });

      // Reset
      setDisplayName('');
      setBaseUnitName('');
      setDisplayUnitName('');
      setMultiplier(1);
      
      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product item.');
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
          <span className="text-gray-900 dark:text-white font-medium">Products</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Product Items</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Manage global inventory catalog items and units.</p>
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
            Add Product
          </button>
        </div>

        {error && !showModal && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Items list / table */}
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
            <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-4xl mb-4 block">📦</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Products Catalogued</h3>
            <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              Start by cataloguing products and assigning them to onboarded wholesale vendors.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold rounded-xl transition-all"
            >
              Add First Product
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55/50 dark:bg-zinc-800/40 text-gray-500 dark:text-zinc-400 font-semibold text-sm border-b border-gray-200 dark:border-zinc-800">
                    <th className="p-4 pl-6">Product Display Name</th>
                    <th className="p-4">Assigned Vendor</th>
                    <th className="p-4">Display Unit</th>
                    <th className="p-4">Base Unit</th>
                    <th className="p-4 text-center">Multiplier</th>
                    <th className="p-4 text-right pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/50">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors text-sm text-gray-700 dark:text-zinc-300"
                    >
                      <td className="p-4 pl-6 font-bold text-gray-900 dark:text-white">
                        {item.displayName}
                      </td>
                      <td className="p-4">
                        {item.vendor?.displayName || 'Unknown Vendor'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 text-xs font-semibold">
                          {item.displayUnitName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-xs">
                          {item.baseUnitName}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono">
                        {item.multiplier}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Form */}
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

              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Create Product Item</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Register inventory SKU items and multiplier rules.</p>

              {error && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {vendors.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-red-500">You must onboard at least one vendor before creating products.</p>
                  <Link
                    href="/dashboard/admin/vendors"
                    className="inline-block px-4 py-2 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl text-xs"
                  >
                    Go Onboard Vendor
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="e.g. Chicken Shawarma Cone (30lb)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Assigned Vendor *
                    </label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Display Unit *
                      </label>
                      <input
                        type="text"
                        required
                        value={displayUnitName}
                        onChange={(e) => setDisplayUnitName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. case, box, cone"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        Base Unit *
                      </label>
                      <input
                        type="text"
                        required
                        value={baseUnitName}
                        onChange={(e) => setBaseUnitName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="e.g. lbs, oz, each"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      Multiplier (Display Unit to Base Unit) *
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.0001"
                      value={multiplier}
                      onChange={(e) => setMultiplier(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                      placeholder="e.g. 30 (1 case = 30 lbs)"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Defines how many base units (e.g. lbs) make up one display unit (e.g. case).
                    </p>
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
                      {formSubmitting ? 'Cataloguing...' : 'Save Product'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
