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
  downloadCsvFile,
  ParsedCsvRow,
} from '../../../../utils/csvParser';

interface RowValidationResult {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE' | 'INVALID';
  isDuplicate?: boolean;
  errors: string[];
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
  duplicateCount: number;
  rows: RowValidationResult[];
}

export default function BulkUploadItemsPage() {
  const router = useRouter();
  const { locations } = useLocations();
  const { selectedLocationId, selectedLocation } = useLocationFilter();

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get active location object
  const activeLocation = locations.find((l) => l.id === selectedLocationId);
  const activeLocationId = selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : undefined;

  // Handle template download
  const handleDownloadTemplate = () => {
    const csvContent = generateProductsCsvTemplate();
    downloadCsvFile('products_add_template.csv', csvContent);
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

  // Run backend validation
  const validateRows = async (rows: ParsedCsvRow[]) => {
    setValidating(true);
    setError('');

    try {
      const mapRowToPayload = (r: ParsedCsvRow) => {
        const vendorName = r.vendorName || r.vendor || r.supplier || undefined;
        const vendorId = r.vendorId || r.vendorid || undefined;
        const displayName = r.displayName || r.productName || r.name || r.title || '';
        const baseUnitName = r.baseUnitName || r.unit || r.stockunit || '';

        return {
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
      const mapRowToPayload = (r: ParsedCsvRow) => {
        const vendorName = r.vendorName || r.vendor || r.supplier || undefined;
        const vendorId = r.vendorId || r.vendorid || undefined;
        const displayName = r.displayName || r.productName || r.name || r.title || '';
        const baseUnitName = r.baseUnitName || r.unit || r.stockunit || '';

        return {
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

      const itemsPayload = parsedRows.map(mapRowToPayload);

      const res = await api.items.bulkUpload({
        items: itemsPayload,
        locationId: activeLocationId,
      });

      setUploadSuccess(res);
    } catch (err: any) {
      setError(err?.message || 'Bulk product creation failed.');
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
            <span className="breadcrumb-current">Bulk CSV Add Products</span>
          </div>

          <div className="page-header">
            <div className="page-header-text">
              <h1>Bulk Add New Products (CSV) <LocationBadge /></h1>
              <p>
                Upload a CSV spreadsheet to add new products to your catalog for{' '}
                <strong>{activeLocation ? activeLocation.name : 'All Locations'}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 15, height: 15 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download CSV Template
              </button>

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
                Bulk Products Added Successfully!
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '520px', margin: '0 auto 24px auto' }}>
                Added <strong>{uploadSuccess.createdCount}</strong> new products to the catalog for{' '}
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
              {/* Template & Field Requirements Guide Card */}
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      CSV Import Guidelines
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                      Download the CSV template, enter your new product details, and upload below. Existing products will be flagged with a warning and skipped.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="badge badge-info" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                      Location: <strong>{activeLocation ? activeLocation.name : 'Global (All Locations)'}</strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Template (.csv)
                    </button>
                  </div>
                </div>

                {/* Field Guide Badges / Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  backgroundColor: 'var(--bg-sunken)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      REQUIRED FIELDS
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li><strong>Product Name</strong>: Name of the product (displayName)</li>
                      <li><strong>Vendor Name</strong>: Vendor display name (must exist in system, e.g. <em>Roma Food Service</em>)</li>
                      <li><strong>Base Unit</strong>: Stock unit (e.g. <em>LB, EA, CS, KG, BAG, OZ, GAL</em>)</li>
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                      DUPLICATE PROTECTION
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li>Product names are checked <strong>case-insensitively</strong>.</li>
                      <li>If a product name already exists in the catalog, it will trigger a warning and be skipped.</li>
                      <li>Existing items cannot be overwritten or updated via CSV.</li>
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                      OPTIONAL DETAILS
                    </div>
                    <ul style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '16px', margin: 0 }}>
                      <li><strong>Product Code / SKU</strong></li>
                      <li><strong>Category</strong> (auto-created if new)</li>
                      <li><strong>Display Unit & Multiplier</strong></li>
                      <li><strong>PAR Level & Spanish Name</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Card */}
              <div className="card" style={{ padding: '24px' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Select CSV File to Add Products
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
                      Select CSV File: {file ? file.name : 'Click to select or drag & drop .csv file'}
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
                      <button
                        type="button"
                        className={`btn btn-sm ${filterTab === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilterTab('valid')}
                      >
                        Ready to Add ({validationResult.validCount})
                      </button>
                      {validationResult.duplicateCount > 0 && (
                        <button
                          type="button"
                          className={`btn btn-sm ${filterTab === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setFilterTab('duplicate')}
                          style={{ color: filterTab === 'duplicate' ? '#ffffff' : '#d97706' }}
                        >
                          ⚠️ Duplicates ({validationResult.duplicateCount})
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
                          'Adding Products...'
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 16, height: 16 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add {validationResult.validCount} New Product(s)
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="table-scroll-container" style={{ maxHeight: '450px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Row</th>
                          <th style={{ width: '130px' }}>Status</th>
                          <th>Product Name</th>
                          <th>Vendor</th>
                          <th>Category</th>
                          <th>Base Unit</th>
                          <th>Pack / Display Unit</th>
                          <th>Code / SKU</th>
                          <th style={{ width: '80px' }}>PAR</th>
                          <th>Validation Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedRows.map((r) => {
                          const isError = r.action === 'INVALID' && !r.isDuplicate;
                          const isDup = r.isDuplicate === true;
                          const isCreate = r.action === 'CREATE';

                          return (
                            <tr
                              key={r.rowNumber}
                              style={{
                                backgroundColor: isDup
                                  ? 'rgba(245, 158, 11, 0.06)'
                                  : isError
                                  ? 'rgba(239, 68, 68, 0.05)'
                                  : undefined,
                              }}
                            >
                              <td className="mono" style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>
                                #{r.rowNumber}
                              </td>

                              <td>
                                {isCreate && (
                                  <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                    NEW PRODUCT
                                  </span>
                                )}
                                {isDup && (
                                  <span className="badge" style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                                    ⚠️ DUPLICATE
                                  </span>
                                )}
                                {isError && (
                                  <span className="badge badge-error" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                    ERROR
                                  </span>
                                )}
                              </td>

                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {r.data.displayName || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing Name</span>}
                              </td>

                              <td>
                                {r.data.vendorName ? (
                                  <span style={{ color: 'var(--text-secondary)' }}>{r.data.vendorName}</span>
                                ) : (
                                  <span style={{ color: '#ef4444', fontStyle: 'italic' }}>Missing Vendor</span>
                                )}
                              </td>

                              <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
                                {r.data.productTypeName || '—'}
                              </td>

                              <td className="mono" style={{ fontWeight: 600 }}>
                                {r.data.baseUnitName || <span style={{ color: '#ef4444' }}>—</span>}
                              </td>

                              <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
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

                              <td className="mono" style={{ fontSize: '0.8125rem' }}>
                                {r.data.productCode || '—'}
                              </td>

                              <td className="mono" style={{ fontWeight: 600 }}>
                                {r.data.parLevel !== undefined ? r.data.parLevel : '—'}
                              </td>

                              <td style={{ fontSize: '0.8125rem' }}>
                                {isDup ? (
                                  <span style={{ color: '#b45309', fontWeight: 500 }}>
                                    ⚠️ Product already exists in catalog (Updates disabled; skipped)
                                  </span>
                                ) : isError ? (
                                  <div style={{ color: '#ef4444', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {r.errors.map((err, idx) => (
                                      <span key={idx}>• {err}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)' }}>
                                    Ready to add to catalog
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
