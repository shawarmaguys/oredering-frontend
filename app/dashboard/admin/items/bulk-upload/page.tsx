'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminGuard from '../../../components/AdminGuard';
import { api } from '../../../../utils/api';
import { useLocationFilter } from '../../../../context/LocationFilterContext';
import { LocationBadge } from '../../../components/LocationBadge';
import { useLocations } from '../../../../context/LocationsContext';
import {
  parseCSV,
  generateProductsCsvTemplate,
  generateVendorProductsCsv,
  downloadCsvFile,
  ParsedCsvRow,
} from '../../../../utils/csvParser';

interface RowValidationResult {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'INVALID';
  isDuplicate?: boolean;
  errors: string[];
  warnings?: string[];
  changedFields?: string[];
  data: {
    id?: string;
    displayName: string;
    baseUnitName: string;
    displayUnitName?: string;
    multiplier?: number;
    vendorId?: string;
    vendorName?: string;
    productTypeId?: string;
    productTypeName?: string;
    productCode?: string;
    spanishName?: string;
    note?: string;
    parLevel?: number;
    isActive?: boolean;
  };
}

interface ValidationResponse {
  total: number;
  validCount: number;
  invalidCount: number;
  createCount: number;
  updateCount: number;
  unchangedCount: number;
  duplicateCount: number;
  rows: RowValidationResult[];
}

export default function BulkUploadItemsPage() {
  const router = useRouter();
  const { locations } = useLocations();
  const { selectedLocationId } = useLocationFilter();

  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [downloadingVendorCsv, setDownloadingVendorCsv] = useState<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'update' | 'unchanged' | 'duplicate' | 'invalid'>('all');

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get active location object
  const activeLocation = locations.find((l) => l.id === selectedLocationId);
  const activeLocationId = selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined;

  // Load vendors list for dropdown selection
  useEffect(() => {
    async function loadVendors() {
      try {
        const data = await api.vendors.list(activeLocationId);
        setVendors(data || []);
        if (data && data.length > 0) {
          setSelectedVendorId((prev) => (prev && (prev === 'all' || data.some((v: any) => v.id === prev)) ? prev : 'all'));
        } else {
          setSelectedVendorId('all');
        }
      } catch (err: any) {
        console.error('Failed to load vendors for selection', err);
      }
    }
    loadVendors();
  }, [selectedLocationId]);

  // Download vendor specific or all vendors pre-populated CSV
  const handleDownloadVendorCsv = async () => {
    if (!selectedVendorId) {
      setError('Please select a vendor to download products.');
      return;
    }

    const isAllVendors = selectedVendorId === 'all';
    const vendorObj = isAllVendors ? null : vendors.find((v) => v.id === selectedVendorId);
    const vendorName = isAllVendors ? 'All Vendors' : (vendorObj?.displayName || vendorObj?.name || 'Vendor');

    setDownloadingVendorCsv(true);
    setError('');

    try {
      const res = await api.items.list({
        vendorId: isAllVendors ? undefined : selectedVendorId,
        locationId: activeLocationId,
        limit: 10000,
      });

      const itemsList = res?.data || [];
      const csvContent = generateVendorProductsCsv(itemsList, isAllVendors ? 'All Vendors' : vendorName);
      const sanitizedVendorName = isAllVendors ? 'all_vendors' : vendorName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const locationSlug = activeLocation ? activeLocation.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'all_locations';
      const filename = `${sanitizedVendorName}_products_${locationSlug}.csv`;

      downloadCsvFile(filename, csvContent);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate vendor products CSV.');
    } finally {
      setDownloadingVendorCsv(false);
    }
  };

  // Handle generic template download
  const handleDownloadBlankTemplate = () => {
    const csvContent = generateProductsCsvTemplate();
    downloadCsvFile('products_bulk_template.csv', csvContent);
  };

  // Handle File Selection & Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploadSuccess(null);
    setValidationResult(null);

    const text = await selectedFile.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      setError('The selected CSV file contains no data rows or has invalid headers.');
      setParsedRows([]);
      return;
    }

    setParsedRows(rows);
    await validateRows(rows);
  };

  const mapRowToPayload = (r: ParsedCsvRow) => {
    const vendorName = r.vendorName || r.vendor || r.supplier || undefined;
    const vendorId = r.vendorId || r.vendorid || undefined;
    const displayName = r.displayName || r.productName || r.name || r.title || '';
    const baseUnitName = r.baseUnitName || r.unit || r.stockunit || '';

    return {
      id: r.id || undefined,
      productCode: r.productCode || undefined,
      displayName,
      vendorName,
      vendorId,
      productTypeName: r.productTypeName || r.category || undefined,
      productTypeId: r.productTypeId || undefined,
      baseUnitName,
      displayUnitName: r.displayUnitName || undefined,
      multiplier: r.multiplier ? Number(r.multiplier) : undefined,
      spanishName: r.spanishName || undefined,
      note: r.note || undefined,
      parLevel: r.parLevel !== undefined && r.parLevel !== '' ? Number(r.parLevel) : undefined,
      isActive: r.isActive || undefined,
    };
  };

  // Run backend validation
  const validateRows = async (rows: ParsedCsvRow[]) => {
    setValidating(true);
    setError('');

    try {
      const itemsPayload = rows.map(mapRowToPayload);

      const res = await api.items.bulkValidate({
        items: itemsPayload,
        locationId: activeLocationId,
      });

      setValidationResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to validate CSV data against system database.');
    } finally {
      setValidating(false);
    }
  };

  // Re-run validation if active location changes in navbar
  useEffect(() => {
    if (parsedRows.length > 0) {
      validateRows(parsedRows);
    }
  }, [selectedLocationId]);

  // Submit Bulk Upload
  const handleBulkUpload = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setUploading(true);
    setError('');

    try {
      const itemsPayload = parsedRows.map(mapRowToPayload);

      const res = await api.items.bulkUpload({
        items: itemsPayload,
        locationId: activeLocationId,
      });

      setUploadSuccess(res);
    } catch (err: any) {
      setError(err?.message || 'Bulk product process failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setValidationResult(null);
    setUploadSuccess(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter rows for display table
  const displayedRows = (validationResult?.rows || []).filter((r) => {
    if (filterTab === 'valid') return r.action === 'CREATE';
    if (filterTab === 'update') return r.action === 'UPDATE';
    if (filterTab === 'unchanged') return r.action === 'UNCHANGED';
    if (filterTab === 'duplicate') return r.isDuplicate === true;
    if (filterTab === 'invalid') return r.action === 'INVALID' && !r.isDuplicate;
    return true;
  });

  return (
    <AdminGuard>
      <div className="page-container">
        {/* Sticky Header Bar */}
        <div className="page-header-sticky">
          <div className="breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="breadcrumb-sep">/</span>
            <Link href="/dashboard/admin/items">Product Catalog</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Bulk CSV Maintenance</span>
          </div>

          <div className="page-header">
            <div className="page-header-text">
              <h1>Bulk Add & Update Products (CSV) <LocationBadge /></h1>
              <p>
                Download vendor product data or upload a CSV to update existing items and add new products for{' '}
                <strong>{activeLocation ? activeLocation.name : 'All Locations'}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link href="/dashboard/admin/items" className="btn btn-secondary">
                Back to Catalog
              </Link>
            </div>
          </div>
        </div>

        {/* Scrollable Page Content */}
        <div className="page-content-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Error Banner */}
          {error && (
            <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}>✕</button>
            </div>
          )}

          {/* Success View */}
          {uploadSuccess ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center', backgroundColor: 'var(--bg-sunken)' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 32, height: 32 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Bulk Product Import Completed Successfully!
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '580px', margin: '0 auto 24px auto' }}>
                Updated <strong>{uploadSuccess.updatedCount || 0}</strong> modified item(s), added{' '}
                <strong>{uploadSuccess.createdCount || 0}</strong> new item(s), and skipped{' '}
                <strong>{uploadSuccess.unchangedCount || 0}</strong> unchanged item(s) for{' '}
                <strong>{activeLocation ? activeLocation.name : 'All Locations'}</strong>.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link href="/dashboard/admin/items" className="btn btn-primary">
                  View Product Catalog
                </Link>
                <button type="button" onClick={handleReset} className="btn btn-secondary">
                  Upload Another CSV File
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Export Vendor Products Card */}
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Step 1: Download Vendor Product CSV
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                      Select a specific vendor or "All Vendors" to download product data with system Product IDs for editing or adding new products.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="form-control"
                      style={{ minWidth: '220px', padding: '7px 12px', fontSize: '0.875rem' }}
                    >
                      <option value="all">All Vendors</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.displayName || v.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleDownloadVendorCsv}
                      disabled={!selectedVendorId || downloadingVendorCsv}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {downloadingVendorCsv
                        ? 'Generating CSV...'
                        : selectedVendorId === 'all'
                        ? 'Download All Vendors CSV'
                        : 'Download Vendor Products CSV'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBlankTemplate}
                      className="btn btn-secondary btn-sm"
                      title="Download blank sample template"
                    >
                      Blank Template
                    </button>
                  </div>
                </div>

                {/* CSV Instructions & Rules */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'var(--bg-sunken)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '16px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563eb' }} />
                      UPDATING EXISTING PRODUCTS
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li>Rows containing a valid <strong>Product ID</strong> will update existing products.</li>
                      <li>Updates apply to name, units, SKU, PAR level, notes, and status.</li>
                      <li><strong>PAR Level</strong> values in CSV must be provided in <strong>individual stock units</strong> (Base Unit).</li>
                      <li>Do not alter or edit the <strong>Product ID</strong> string.</li>
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#22c55e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                      ADDING NEW PRODUCTS
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li>To add new products, append rows and leave <strong>Product ID blank</strong>.</li>
                      <li><strong>Product Name</strong>, <strong>Vendor Name</strong>, and <strong>Base Unit</strong> are required.</li>
                      <li>New products are automatically enabled for <strong>{activeLocation ? activeLocation.name : 'All Locations'}</strong>.</li>
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                      VALIDATION SAFEGUARDS
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li>Invalid IDs or cross-name collisions will trigger validation errors.</li>
                      <li>Review table preview before confirming updates to the database.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Card */}
              <div className="card" style={{ padding: '24px' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Step 2: Upload Modified CSV File
                </span>
                <label
                  htmlFor="csv-file-input"
                  style={{
                    display: 'block',
                    border: '2px dashed var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: file ? 'var(--accent-subtle)' : 'var(--bg-sunken)',
                    borderColor: file ? 'var(--accent)' : 'var(--border-default)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    id="csv-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" style={{ width: 24, height: 24, color: file ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: file ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      Select CSV File: {file ? file.name : 'Click to select or drag & drop modified .csv file'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Loading State */}
              {validating && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div className="skeleton" style={{ height: '24px', width: '200px', margin: '0 auto 12px auto' }} />
                  Checking CSV rows against current product catalog and vendors...
                </div>
              )}

              {/* Validation & Preview Table */}
              {validationResult && !validating && (
                <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Header Actions & Filter Tabs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilterTab('all')}
                      >
                        All Rows ({validationResult.total})
                      </button>

                      {validationResult.updateCount > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm ${filterTab === 'update' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFilterTab('update')}
                          style={{ color: filterTab === 'update' ? '#ffffff' : '#2563eb' }}
                        >
                          Modified Updates ({validationResult.updateCount})
                        </button>
                      )}

                      {validationResult.unchangedCount > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm ${filterTab === 'unchanged' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFilterTab('unchanged')}
                          style={{ color: filterTab === 'unchanged' ? '#ffffff' : 'var(--text-secondary)' }}
                        >
                          Unchanged ({validationResult.unchangedCount})
                        </button>
                      )}

                      <button
                        type="button"
                        className={`btn btn-sm ${filterTab === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilterTab('valid')}
                      >
                        New Products ({validationResult.createCount})
                      </button>

                      {validationResult.duplicateCount > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm ${filterTab === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFilterTab('duplicate')}
                          style={{ color: filterTab === 'duplicate' ? '#ffffff' : '#d97706' }}
                        >
                          ⚠️ Warnings ({validationResult.duplicateCount})
                        </button>
                      )}

                      {validationResult.invalidCount - validationResult.duplicateCount > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm ${filterTab === 'invalid' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFilterTab('invalid')}
                          style={{ color: filterTab === 'invalid' ? '#ffffff' : '#ef4444' }}
                        >
                          Errors ({validationResult.invalidCount - validationResult.duplicateCount})
                        </button>
                      )}
                    </div>

                    {/* Execute Upload Button */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleBulkUpload}
                        disabled={uploading || validationResult.validCount === 0}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
                      >
                        {uploading ? (
                          'Processing Products...'
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Process Bulk Import (
                            {validationResult.updateCount > 0 ? `${validationResult.updateCount} Updates, ` : ''}
                            {validationResult.createCount > 0 ? `${validationResult.createCount} New, ` : ''}
                            {validationResult.unchangedCount > 0 ? `${validationResult.unchangedCount} Unchanged` : ''}
                            )
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="table-scroll-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '520px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                    <table className="table" style={{ width: '100%', minWidth: '1200px', borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-sunken)' }}>
                        <tr style={{ backgroundColor: 'var(--bg-sunken)' }}>
                          <th style={{ width: '60px', textAlign: 'center', whiteSpace: 'nowrap', padding: '12px 8px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Row</th>
                          <th style={{ width: '120px', whiteSpace: 'nowrap', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Status</th>
                          <th style={{ minWidth: '220px', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Product Name</th>
                          <th style={{ minWidth: '150px', whiteSpace: 'nowrap', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Vendor</th>
                          <th style={{ minWidth: '120px', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Category</th>
                          <th style={{ width: '90px', whiteSpace: 'nowrap', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Base Unit</th>
                          <th style={{ minWidth: '140px', whiteSpace: 'nowrap', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Pack / Display Unit</th>
                          <th style={{ minWidth: '110px', whiteSpace: 'nowrap', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Code / SKU</th>
                          <th style={{ width: '70px', textAlign: 'center', padding: '12px 8px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>PAR</th>
                          <th style={{ minWidth: '240px', padding: '12px 12px', backgroundColor: 'var(--bg-sunken)', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 0 var(--border-default)' }}>Validation Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.map((r) => {
                          const isError = r.action === 'INVALID' && !r.isDuplicate;
                          const isDup = r.isDuplicate === true;
                          const isCreate = r.action === 'CREATE';
                          const isUpdate = r.action === 'UPDATE';
                          const isUnchanged = r.action === 'UNCHANGED';

                          return (
                            <tr
                              key={r.rowNumber}
                              style={{
                                backgroundColor: isUpdate
                                  ? 'rgba(59, 130, 246, 0.04)'
                                  : isDup
                                  ? 'rgba(245, 158, 11, 0.05)'
                                  : isError
                                  ? 'rgba(239, 68, 68, 0.05)'
                                  : undefined,
                                borderBottom: '1px solid var(--border-subtle)',
                              }}
                            >
                              <td className="mono" style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-tertiary)', padding: '12px 8px', verticalAlign: 'top' }}>
                                #{r.rowNumber}
                              </td>

                              <td style={{ whiteSpace: 'nowrap', padding: '12px 12px', verticalAlign: 'top' }}>
                                {isUpdate && (
                                  <span className="badge" style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '4px 8px' }}>
                                    UPDATE
                                  </span>
                                )}
                                {isUnchanged && (
                                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px' }}>
                                    UNCHANGED
                                  </span>
                                )}
                                {isCreate && (
                                  <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px' }}>
                                    NEW PRODUCT
                                  </span>
                                )}
                                {isDup && (
                                  <span className="badge" style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '4px 8px' }}>
                                    ⚠️ DUPLICATE
                                  </span>
                                )}
                                {isError && (
                                  <span className="badge badge-error" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px' }}>
                                    ERROR
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: '12px 12px', verticalAlign: 'top' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.3' }}>
                                  {r.data.displayName || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing Name</span>}
                                </div>
                                {r.data.id && (
                                  <div className="mono" style={{ fontSize: '0.715rem', color: 'var(--text-tertiary)', fontWeight: 400, marginTop: '3px', wordBreak: 'break-all', opacity: 0.85 }}>
                                    ID: {r.data.id}
                                  </div>
                                )}
                              </td>

                              <td style={{ whiteSpace: 'nowrap', padding: '12px 12px', verticalAlign: 'top' }}>
                                {r.data.vendorName ? (
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.data.vendorName}</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing Vendor</span>
                                )}
                              </td>

                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', padding: '12px 12px', verticalAlign: 'top' }}>
                                {r.data.productTypeName || '—'}
                              </td>

                              <td className="mono" style={{ fontWeight: 600, whiteSpace: 'nowrap', padding: '12px 12px', verticalAlign: 'top' }}>
                                {r.data.baseUnitName || <span style={{ color: '#ef4444' }}>—</span>}
                              </td>

                              <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', padding: '12px 12px', verticalAlign: 'top' }}>
                                {r.data.displayUnitName ? (
                                  <>
                                    {r.data.displayUnitName}{' '}
                                    <span className="mono" style={{ color: 'var(--text-tertiary)' }}>
                                      ({r.data.multiplier}x)
                                    </span>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </td>

                              <td className="mono" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap', padding: '12px 12px', verticalAlign: 'top' }}>
                                {r.data.productCode || '—'}
                              </td>

                              <td className="mono" style={{ textAlign: 'center', fontWeight: 600, padding: '12px 8px', verticalAlign: 'top' }}>
                                {r.data.parLevel !== undefined ? r.data.parLevel : '—'}
                              </td>

                              <td style={{ fontSize: '0.8125rem', padding: '12px 12px', verticalAlign: 'top', lineHeight: '1.4' }}>
                                {isUnchanged ? (
                                  <span style={{ color: 'var(--text-tertiary)' }}>
                                    No changes detected (will be skipped during import)
                                  </span>
                                ) : isUpdate ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                      </svg>
                                      Modified:
                                    </span>
                                    {r.changedFields && r.changedFields.length > 0 ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                                        {r.changedFields.map((change, idx) => (
                                          <span key={idx} style={{ color: '#1d4ed8', fontSize: '0.78rem', fontWeight: 500 }}>
                                            • {change}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#2563eb', fontWeight: 500 }}>
                                        Ready to update modified product details
                                      </span>
                                    )}
                                  </div>
                                ) : isDup ? (
                                  <div style={{ color: '#b45309', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {r.warnings && r.warnings.length > 0 ? (
                                      r.warnings.map((warn, idx) => (
                                        <span key={idx} style={{ fontWeight: 500 }}>{warn}</span>
                                      ))
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>
                                        ⚠️ Product name or code exists. Include Product ID to update existing product, or proceed to add as new.
                                      </span>
                                    )}
                                  </div>
                                ) : isError ? (
                                  <div style={{ color: '#ef4444', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {r.errors.map((err, idx) => (
                                      <span key={idx}>• {err}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)' }}>
                                    Ready to add new product to catalog
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
