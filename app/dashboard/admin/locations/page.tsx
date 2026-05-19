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
  slackBotToken?: string;
  slackUserToken?: string;
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
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackUserToken, setSlackUserToken] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Edit Form State
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSlackBotToken, setEditSlackBotToken] = useState('');
  const [editSlackUserToken, setEditSlackUserToken] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Products Management State
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [locationItems, setLocationItems] = useState<any[]>([]);
  const [productsSearch, setProductsSearch] = useState('');
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  const fetchLocationItems = async (locationId: string) => {
    setProductsLoading(true);
    try {
      const data = await api.locations.getItems(locationId);
      setLocationItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products for location.');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleToggleProduct = async (item: any) => {
    if (!selectedLocation) return;
    setSavingItemId(item.id);
    try {
      if (item.assigned) {
        // Toggle OFF (unassign)
        await api.locations.removeItem(selectedLocation.id, item.id);
        setLocationItems(prev => prev.map(x => x.id === item.id ? { ...x, assigned: false, isActive: false } : x));
      } else {
        // Toggle ON (assign)
        await api.locations.addOrUpdateItem(selectedLocation.id, {
          itemId: item.id,
          parLevel: item.parLevel || 0,
          isActive: true
        });
        setLocationItems(prev => prev.map(x => x.id === item.id ? { ...x, assigned: true, isActive: true } : x));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment.');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleUpdateDetails = async (item: any, parLevel: number) => {
    if (!selectedLocation) return;
    setSavingItemId(item.id);
    try {
      await api.locations.addOrUpdateItem(selectedLocation.id, {
        itemId: item.id,
        parLevel,
        isActive: item.isActive
      });
      setLocationItems(prev => prev.map(x => x.id === item.id ? { ...x, parLevel } : x));
    } catch (err: any) {
      alert(err.message || 'Failed to update item details.');
    } finally {
      setSavingItemId(null);
    }
  };

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
      await api.locations.create({ name, address, phone, email, slackBotToken, slackUserToken });
      setName('');
      setAddress('');
      setPhone('');
      setEmail('');
      setSlackBotToken('');
      setSlackUserToken('');
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
        slackBotToken: editSlackBotToken,
        slackUserToken: editSlackUserToken,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation Breadcrumbs */}
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Locations</span>
        </div>

        {/* Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Store Locations</h1>
            <p>Onboard and manage franchise store branches, contact credentials, and delivery directions.</p>
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
            Add Location
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

        {/* Locations List */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '24px'
          }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse" style={{ padding: '24px', height: '200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '24px', width: '50%' }} />
                <div className="skeleton" style={{ height: '14px', width: '80%' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%' }} />
              </div>
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 01-6 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3>No store locations yet</h3>
              <p>Onboard your franchise storefront branches to organize inventory sheets and audits.</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
              >
                Add First Location
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '24px'
          }} className="stagger">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="card card-hover"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Accent element */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '80px',
                  height: '80px',
                  background: 'var(--accent-subtle)',
                  borderRadius: '50%',
                  filter: 'blur(30px)',
                  marginRight: '-20px',
                  marginTop: '-20px',
                  pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-sunken)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 01-6 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {loc.name}
                      </h3>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedLocation(loc);
                        setEditName(loc.name);
                        setEditAddress(loc.address);
                        setEditPhone(loc.phone);
                        setEditEmail(loc.email);
                        setEditSlackBotToken(loc.slackBotToken || '');
                        setEditSlackUserToken(loc.slackUserToken || '');
                        setError('');
                        setShowEditModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                      title="Edit Location"
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, minHeight: '36px' }} className="line-clamp-2">
                      {loc.address || 'No address provided'}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-tertiary)',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📞</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{loc.phone || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span>✉️</span>
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.email || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span>💬</span>
                        <span style={{ 
                          color: loc.slackBotToken && loc.slackUserToken ? 'var(--accent)' : 'var(--text-tertiary)',
                          fontWeight: loc.slackBotToken && loc.slackUserToken ? '500' : 'normal',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          Slack: {loc.slackBotToken && loc.slackUserToken ? 'Configured' : 'Not configured'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedLocation(loc);
                    setError('');
                    setProductsSearch('');
                    setShowProductsModal(true);
                    fetchLocationItems(loc.id);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', zIndex: 2 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Manage Products
                </button>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.6875rem',
                  color: 'var(--text-tertiary)'
                }}>
                  <span className="mono">ID: {loc.id.substring(0, 8)}</span>
                  {loc.createdAt && <span>Added {new Date(loc.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Add form */}
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
                <h2>Add Store Location</h2>
                <p>Register a storefront franchise to organize regional inventories and audit reports.</p>
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
                <div>
                  <label className="label" htmlFor="loc-name">Location Name *</label>
                  <input
                    id="loc-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="e.g. San Diego Downtown"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="loc-phone">Phone Number *</label>
                    <input
                      id="loc-phone"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input"
                      placeholder="e.g. +1 (619) 555-0100"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="loc-email">Email Address *</label>
                    <input
                      id="loc-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="downtown@shawarmaguys.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="loc-address">Full Address *</label>
                  <textarea
                    id="loc-address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="input"
                    placeholder="e.g. 555 Broadway, San Diego, CA 92101"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="loc-slack-bot">Slack Bot Token</label>
                    <input
                      id="loc-slack-bot"
                      type="password"
                      value={slackBotToken}
                      onChange={(e) => setSlackBotToken(e.target.value)}
                      className="input"
                      placeholder="xoxb-..."
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="loc-slack-user">Slack User Token</label>
                    <input
                      id="loc-slack-user"
                      type="password"
                      value={slackUserToken}
                      onChange={(e) => setSlackUserToken(e.target.value)}
                      className="input"
                      placeholder="xoxp-..."
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
                    {formSubmitting ? 'Creating...' : 'Save Location'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit form */}
        {showEditModal && selectedLocation && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-sm">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLocation(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header">
                <h2>Edit Store Location</h2>
                <p>Modify franchise storefront coordinates and branch contact credentials.</p>
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
                <div>
                  <label className="label" htmlFor="edit-loc-name">Location Name *</label>
                  <input
                    id="edit-loc-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-loc-phone">Phone Number *</label>
                    <input
                      id="edit-loc-phone"
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-loc-email">Email Address *</label>
                    <input
                      id="edit-loc-email"
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="edit-loc-address">Full Address *</label>
                  <textarea
                    id="edit-loc-address"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={3}
                    className="input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="label" htmlFor="edit-loc-slack-bot">Slack Bot Token</label>
                    <input
                      id="edit-loc-slack-bot"
                      type="password"
                      value={editSlackBotToken}
                      onChange={(e) => setEditSlackBotToken(e.target.value)}
                      className="input"
                      placeholder="xoxb-..."
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-loc-slack-user">Slack User Token</label>
                    <input
                      id="edit-loc-slack-user"
                      type="password"
                      value={editSlackUserToken}
                      onChange={(e) => setEditSlackUserToken(e.target.value)}
                      className="input"
                      placeholder="xoxp-..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedLocation(null);
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

        {/* Modal Manage Products */}
        {showProductsModal && selectedLocation && (
          <div className="modal-backdrop">
            <div className="modal-panel modal-panel-lg" style={{ maxWidth: '1100px', width: '90vw', height: '80vh', maxHeight: '850px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px 28px 24px' }}>
              <button
                onClick={() => {
                  setShowProductsModal(false);
                  setSelectedLocation(null);
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h2>Manage Location Products</h2>
                <p>Configure which catalog items are active at <strong>{selectedLocation.name}</strong>, customize stock par levels, and display order.</p>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '16px 0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search products by name, code, or vendor..."
                    value={productsSearch}
                    onChange={(e) => setProductsSearch(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '1rem' }}>🔍</span>
                </div>
              </div>

              {/* Products Table / List */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px', paddingBottom: '20px' }}>
                {productsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px 0' }}>
                    <div className="skeleton" style={{ height: '36px', width: '100%' }} />
                    <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                    <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                    <div className="skeleton" style={{ height: '32px', width: '100%' }} />
                  </div>
                ) : (
                  (() => {
                    const filtered = locationItems.filter(item => {
                      const searchLower = productsSearch.toLowerCase();
                      return (
                        item.displayName.toLowerCase().includes(searchLower) ||
                        (item.productCode && item.productCode.toLowerCase().includes(searchLower)) ||
                        (item.vendor && item.vendor.displayName.toLowerCase().includes(searchLower))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                          No matching products found in the catalog.
                        </div>
                      );
                    }

                    return (
                      <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>Assign</th>
                            <th>Product Details</th>
                            <th>Vendor</th>
                            <th style={{ width: '130px' }}>Par Level</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => {
                            const isSaving = savingItemId === item.id;
                            return (
                              <tr key={item.id} style={{ opacity: item.assigned ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                                <td style={{ textAlign: 'center', padding: '12px' }}>
                                  <label className="switch-label" style={{ display: 'inline-block', position: 'relative', width: '40px', height: '20px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={item.assigned}
                                      disabled={isSaving}
                                      onChange={() => handleToggleProduct(item)}
                                      style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                      position: 'absolute',
                                      cursor: 'pointer',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      backgroundColor: item.assigned ? 'var(--accent)' : 'var(--bg-sunken)',
                                      border: '1px solid var(--border-subtle)',
                                      transition: '0.2s',
                                      borderRadius: '10px'
                                    }}>
                                      <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '14px',
                                        width: '14px',
                                        left: item.assigned ? '23px' : '2px',
                                        bottom: '2px',
                                        backgroundColor: 'white',
                                        transition: '0.2s',
                                        borderRadius: '50%',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                      }} />
                                    </span>
                                  </label>
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.displayName}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    SKU: <span className="mono">{item.productCode || '—'}</span> | Unit: {item.baseUnitName}
                                  </div>
                                </td>
                                <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                  {item.vendor?.displayName || '—'}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      disabled={!item.assigned || isSaving}
                                      value={item.parLevel}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                                        setLocationItems(prev => prev.map(x => x.id === item.id ? { ...x, parLevel: val } : x));
                                      }}
                                      onBlur={(e) => {
                                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                                        handleUpdateDetails(item, val);
                                      }}
                                      className="input mono"
                                      style={{ padding: '4px 8px', fontSize: '0.8125rem', height: '30px', width: '80px', textAlign: 'right' }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{item.baseUnitName}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', padding: '12px' }}>
                                  {isSaving ? (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>saving...</span>
                                  ) : item.assigned ? (
                                    <span className="badge badge-green" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>Active</span>
                                  ) : (
                                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem', padding: '2px 6px', opacity: 0.7 }}>Inactive</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowProductsModal(false);
                    setSelectedLocation(null);
                  }}
                  className="btn btn-primary"
                  style={{ minWidth: '100px' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
