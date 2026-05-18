'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import AdminGuard from '../../components/AdminGuard';
import Link from 'next/link';

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy: string;
  submittedByUser?: {
    fullName: string;
  };
  slackMessageTs?: string;
  submittedAt: string;
  approvedAt?: string;
}

interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendor?: {
    displayName: string;
  };
  locationId: string;
  location?: {
    name: string;
  };
  stockRecordId?: string;
  createdBy: string;
  createdByUser?: {
    fullName: string;
  };
  approvedBy?: string;
  approvedByUser?: {
    fullName: string;
  };
  status: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED' | 'CANCELLED';
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  approvedAt?: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'stock'>('pos');
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selected Details State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poDetailsLoading, setPoDetailsLoading] = useState(false);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'pos') {
        const data = await api.purchaseOrders.list();
        const mapped = data.map((po: any) => ({
          id: po.id,
          vendorId: po.vendorId || po.vendor_id,
          vendor: po.vendor,
          locationId: po.locationId || po.location_id,
          location: po.location,
          stockRecordId: po.stockRecordId || po.stock_record_id,
          createdBy: po.createdBy || po.created_by,
          createdByUser: po.createdByUser || po.createdBy_user || { fullName: 'Worker Portal' },
          approvedBy: po.approvedBy || po.approved_by,
          approvedByUser: po.approvedByUser || po.approvedBy_user,
          status: po.status,
          pdfUrl: po.pdfUrl || po.pdf_url,
          notes: po.notes,
          createdAt: po.createdAt || po.created_at,
          approvedAt: po.approvedAt || po.approved_at,
        }));
        setPos(mapped);
      } else {
        const data = await api.stockRecords.list();
        const mapped = data.map((sr: any) => ({
          id: sr.id,
          locationId: sr.locationId || sr.location_id,
          location: sr.location,
          submittedBy: sr.submittedBy || sr.submitted_by,
          submittedByUser: sr.submittedByUser || sr.submittedBy_user || { fullName: 'System Worker' },
          slackMessageTs: sr.slackMessageTs || sr.slack_message_ts,
          submittedAt: sr.submittedAt || sr.submitted_at,
          approvedAt: sr.approvedAt || sr.approved_at,
        }));
        setStockRecords(mapped);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const handlePOSelect = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setPoDetailsLoading(true);
    setPoItems([]);
    try {
      const details = await api.purchaseOrders.get(po.id);
      // Expected items list: [{ id, itemId, item: { displayName }, quantity, unitName }]
      setPoItems(details.items || []);
    } catch (err: any) {
      console.error('Failed to load PO details', err);
    } finally {
      setPoDetailsLoading(false);
    }
  };

  const handleApprovePO = async (id: string) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) return;
    setActionLoading(true);
    setError('');

    try {
      await api.purchaseOrders.approve(id);
      setSelectedPO(null);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve purchase order.');
    } finally {
      setActionLoading(false);
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
          <span className="text-gray-900 dark:text-white font-medium">Reports</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Reports & Purchase Orders</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1">Verify kitchen stock records and authorize wholesale purchase orders.</p>
        </div>

        {/* Tabs System */}
        <div className="flex border-b border-gray-200 dark:border-zinc-800">
          <button
            onClick={() => {
              setSelectedPO(null);
              setActiveTab('pos');
            }}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            📋 Purchase Orders
          </button>
          <button
            onClick={() => {
              setSelectedPO(null);
              setActiveTab('stock');
            }}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'stock'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            }`}
          >
            📊 Submitted Stock Records
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm animate-fade-in-up">
            {error}
          </div>
        )}

        {/* Reports Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            ) : activeTab === 'pos' ? (
              pos.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <span className="text-4xl mb-4 block">📋</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Purchase Orders</h3>
                  <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Purchase orders generated from stock records will appear here for management approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pos.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => handlePOSelect(po)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-center gap-4 bg-white dark:bg-zinc-900 relative overflow-hidden group ${
                        selectedPO?.id === po.id
                          ? 'border-teal-500 ring-2 ring-teal-500/20 dark:border-teal-500'
                          : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            po.status === 'GENERATED' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20' :
                            po.status === 'SENT' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20' :
                            po.status === 'ACKNOWLEDGED' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' :
                            'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-550/20'
                          }`}>
                            {po.status}
                          </span>
                          <span className="text-xs text-gray-400">ID: {po.id.substring(0, 8)}...</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {po.vendor?.displayName || 'Unknown Supplier'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          Location: <span className="font-semibold text-gray-700 dark:text-zinc-300">{po.location?.name || 'Main Location'}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-gray-400 block mb-1">Generated</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              stockRecords.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <span className="text-4xl mb-4 block">📊</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Stock Records</h3>
                  <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Kitchen stock counts performed by workers in the field will be catalogued here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stockRecords.map((sr) => (
                    <div
                      key={sr.id}
                      className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex justify-between items-center gap-4 hover:border-teal-500/30 transition-all"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-gray-400 block">ID: {sr.id.substring(0, 8)}...</span>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {sr.location?.name || 'Store Location'}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          Submitted by: <span className="font-semibold text-gray-700 dark:text-zinc-300">{sr.submittedByUser?.fullName || 'Worker'}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-gray-400 block mb-1">Timestamp</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-zinc-200 block">
                          {new Date(sr.submittedAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400 block font-mono">
                          {new Date(sr.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Details / Actions Sidebar */}
          <div className="lg:col-span-1">
            {activeTab === 'pos' && selectedPO ? (
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-6 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-600" />
                
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white truncate">PO Details</h3>
                  <button
                    onClick={() => setSelectedPO(null)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-sm border-b border-gray-100 dark:border-zinc-800/80 pb-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Vendor / Supplier</span>
                    <span className="font-bold text-base text-teal-600 dark:text-teal-400">
                      {selectedPO.vendor?.displayName || 'Wholesaler'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Store Location</span>
                    <span className="font-bold text-gray-800 dark:text-zinc-200">
                      {selectedPO.location?.name || 'Store'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Status</span>
                    <span className="font-mono text-xs font-bold text-gray-700 dark:text-zinc-300">
                      {selectedPO.status}
                    </span>
                  </div>

                  {selectedPO.notes && (
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Order Notes</span>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 italic">
                        "{selectedPO.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div className="space-y-3">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Ordered Items</span>
                  {poDetailsLoading ? (
                    <div className="space-y-2 animate-pulse py-4">
                      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
                      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                    </div>
                  ) : poItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No items listed in this purchase order.</p>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2.5">
                      {poItems.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-xs p-2 bg-gray-50 dark:bg-zinc-850 border border-gray-100 dark:border-zinc-800/80 rounded-xl"
                        >
                          <span className="font-bold text-gray-800 dark:text-zinc-200 truncate pr-2">
                            {item.item?.displayName || 'Item'}
                          </span>
                          <span className="shrink-0 font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded">
                            {item.quantity} {item.unitName}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Approval Action */}
                {selectedPO.status === 'GENERATED' && (
                  <button
                    onClick={() => handleApprovePO(selectedPO.id)}
                    disabled={actionLoading}
                    className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-teal-950 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)] flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0110 21a3.745 3.745 0 01-3.068-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0114 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    {actionLoading ? 'Approving...' : 'Approve Purchase Order'}
                  </button>
                )}
                
                {selectedPO.pdfUrl && (
                  <a
                    href={selectedPO.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm text-center"
                  >
                    📄 View Order PDF
                  </a>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-900/40 border border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-8 text-center text-gray-400 dark:text-zinc-550">
                <span className="text-3xl mb-3 block">👈</span>
                <p className="text-sm">
                  {activeTab === 'pos'
                    ? 'Select a Purchase Order from the list to view items and perform manager approvals.'
                    : 'Stock records are read-only audits log generated directly by kitchen workers.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
