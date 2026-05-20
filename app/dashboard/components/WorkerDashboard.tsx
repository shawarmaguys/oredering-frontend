'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface StockRecordItem {
  id: string;
  itemId: string;
  item?: {
    id: string;
    displayName: string;
    baseUnitName: string;
  };
  enteredQuantity: number;
  enteredUnit: string;
}

interface StockRecord {
  id: string;
  locationId: string;
  location?: {
    name: string;
  };
  submittedBy?: string;
  submittedByUser?: {
    fullName: string;
  };
  submittedAt: string;
  isCompleted: boolean;
  items?: StockRecordItem[];
}

export default function WorkerDashboard() {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    fetchRecords();
    fetchLocations();
  }, [user]);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.stockRecords.list();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await api.locations.list();
      const filtered = user?.role === 'ADMIN' 
        ? data 
        : data.filter((loc: any) => user?.locationIds?.includes(loc.id));
      
      setLocations(filtered);
      if (filtered.length > 0) {
        setSelectedLocation(filtered[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load locations:', err);
    }
  };

  const handleStartSubmission = (recordId: string) => {
    router.push(`/dashboard?recordId=${recordId}`);
  };

  const drafts = records.filter(r => !r.isCompleted && (!selectedLocation || r.locationId === selectedLocation));
  const completed = records.filter(r => r.isCompleted && (!selectedLocation || r.locationId === selectedLocation));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{t('Store Portal')}</h1>
          <p>{t('Record kitchen stock audits, view schedules, and submit daily physical quantities.')}</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Location Selector Card at the Top */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{t('Active Store Location')}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{t('Filter pending audits and completed submissions for your kitchen.')}</p>
        </div>
        <div style={{ width: '100%', maxWidth: '280px' }}>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.875rem',
              backgroundColor: 'var(--bg-sunken)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {locations.length === 0 ? (
              <option value="">{t('No locations assigned')}</option>
            ) : (
              locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Content - Inventory Audits */}
      <div className="card animate-fade-up" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'var(--accent-subtle)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          marginRight: '-50px',
          marginTop: '-50px',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: drafts.length > 0 ? 'var(--warning-subtle)' : 'var(--accent-subtle)',
              border: drafts.length > 0 ? '1px solid rgba(217,119,6,0.2)' : '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: drafts.length > 0 ? 'var(--warning)' : 'var(--accent)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {drafts.length > 0 ? t('Action Required') : t('All Caught Up!')}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                {drafts.length > 0 
                  ? `${t('You have')} ${drafts.length} ${t('pending inventory count(s) to complete today.')}` 
                  : t('No scheduled inventory counts are currently pending.')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-xl)' }} />
                <div className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-xl)' }} />
              </div>
            ) : (
              <>
                {/* Active Drafts */}
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      backgroundColor: 'var(--bg-sunken)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t('Pending Stock Audit')}: {draft.location?.name || t('Store Location')}
                      </h3>
                      <span className="badge badge-amber" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                        <span className="badge-dot" />
                        {t('Awaiting Count')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartSubmission(draft.id)}
                      className="btn btn-primary"
                    >
                      {t('Start submission')}
                    </button>
                  </div>
                ))}

                {/* Finished Audits */}
                {completed.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-xl)',
                      border: '1px solid var(--border-subtle)',
                      gap: '16px',
                      flexWrap: 'wrap',
                      opacity: 0.8
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t('Submitted Audit')}: {comp.location?.name || t('Store Location')}
                      </h3>
                      <span className="badge badge-green" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        {t('Submitted Audit')} at {new Date(comp.submittedAt).toLocaleDateString()} {new Date(comp.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {t('Completed')}
                    </span>
                  </div>
                ))}

                {!loading && drafts.length === 0 && completed.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    {t('No stock take history logged for today yet.')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
