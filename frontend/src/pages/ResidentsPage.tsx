import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getResidents,
  getResidentFilterOptions,
  getSafehouses,
  createResident,
  updateResident,
  deleteResident,
  type Resident,
  type Safehouse,
} from '../lib/lighthouseAPI';

const SEX_OPTIONS = ['F', 'M'] as const;
const CASE_STATUS_OPTIONS = ['Active', 'Closed', 'Transferred'] as const;
const CASE_CATEGORY_OPTIONS = [
  'Abandoned',
  'Foundling',
  'Surrendered',
  'Neglected',
] as const;
const BIRTH_STATUS_OPTIONS = ['Marital', 'Non-Marital'] as const;
const REFERRAL_SOURCE_OPTIONS = [
  'Government Agency',
  'NGO',
  'Police',
  'Self-Referral',
  'Community',
  'Court Order',
] as const;
const REINTEGRATION_TYPE_OPTIONS = [
  'Family Reunification',
  'Foster Care',
  'Adoption (Domestic)',
  'Adoption (Inter-Country)',
  'Independent Living',
  'None',
] as const;
const REINTEGRATION_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Hold'] as const;

function ResidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState('');
  const [selectedCaseStatuses, setSelectedCaseStatuses] = useState<string[]>([]);
  const [selectedCaseCategories, setSelectedCaseCategories] = useState<string[]>([]);
  const [selectedSafehouses, setSelectedSafehouses] = useState<string[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'residentId' | 'internalCode' | 'safehouseId' | 'caseStatus' | 'sex' | 'caseCategory' | 'currentRiskLevel' | 'assignedSocialWorker' | 'dateOfAdmission' | 'mlPredictionStatus'>('residentId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [caseStatuses, setCaseStatuses] = useState<string[]>([]);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);
  const [caseCategories, setCaseCategories] = useState<string[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Partial<Resident> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    void loadFilterOptions();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadResidents();
  }, [isAuthenticated, isLoading]);

  async function loadFilterOptions() {
    try {
      const opts = await getResidentFilterOptions();
      setCaseStatuses(opts.caseStatuses);
      setRiskLevels(opts.riskLevels);
      setCaseCategories(opts.caseCategories);
    } catch { /* ignore */ }
    try {
      const sh = await getSafehouses();
      setSafehouses(sh);
    } catch { /* ignore */ }

    try {
      const result = await getResidents({ page: 1, pageSize: 1000 });
      const categories = Array.from(new Set(result.items.map((resident) => resident.caseCategory).filter((category): category is string => Boolean(category)))).sort();
      setCaseCategories(categories);
    } catch { /* ignore */ }
  }

  async function loadResidents() {
    setLoading(true);
    setError('');
    try {
      const result = await getResidents({ page: 1, pageSize: 1000 });
      setResidents(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load residents.');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(resident: Resident) {
    setEditingResident({ ...resident });
    setSaveError('');
    setShowModal(true);
  }

  function buildSelectOptions(staticOptions: readonly string[], dynamicOptions: string[] = [], currentValue?: string) {
    const merged = new Set<string>(staticOptions.filter(Boolean));
    dynamicOptions.filter(Boolean).forEach((option) => merged.add(option));
    if (currentValue && currentValue.trim()) merged.add(currentValue.trim());
    return Array.from(merged);
  }

  function safehouseLabel(id?: number) {
    if (id == null) return 'Unassigned';
    const safehouse = safehouses.find((item) => item.safehouseId === id);
    return safehouse ? `${safehouse.safehouseCode ?? safehouse.safehouseId} - ${safehouse.name ?? 'Unnamed safehouse'}` : String(id);
  }

  function parseDate(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatYearsMonths(start: Date, end: Date) {
    if (end < start) return '';

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();

    if (end.getDate() < start.getDate()) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return '';

    return `${years} year(s) ${months} month(s)`;
  }

  function computeAge(dateOfBirth?: string, referenceDate?: string) {
    const dob = parseDate(dateOfBirth);
    const reference = referenceDate ? parseDate(referenceDate) : new Date();
    if (!dob || !reference || reference < dob) return '';
    return formatYearsMonths(dob, reference);
  }

  function computeLengthOfStay(dateOfAdmission?: string, dateClosed?: string) {
    const admission = parseDate(dateOfAdmission);
    const end = dateClosed ? parseDate(dateClosed) : new Date();
    if (!admission || !end || end < admission) return '';
    return formatYearsMonths(admission, end);
  }

  function handleNew() {
    setEditingResident({});
    setSaveError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingResident) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload: Partial<Resident> = {
        ...editingResident,
        ageUponAdmission: computeAge(String(editingResident.dateOfBirth ?? ''), String(editingResident.dateOfAdmission ?? '')),
        presentAge: computeAge(String(editingResident.dateOfBirth ?? '')),
        lengthOfStay: computeLengthOfStay(String(editingResident.dateOfAdmission ?? ''), String(editingResident.dateClosed ?? '')),
      };

      if (editingResident.residentId) {
        await updateResident(editingResident.residentId, payload);
      } else {
        await createResident(payload);
      }
      setShowModal(false);
      await loadResidents();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this resident record?')) return;
    try {
      await deleteResident(id);
      await loadResidents();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  const filteredResidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return residents.filter((resident) => {
      const searchMatch = !query || [
        resident.internalCode,
        resident.assignedSocialWorker,
        resident.caseCategory,
        resident.referralSource,
        String(resident.residentId),
      ].some((value) => String(value ?? '').toLowerCase().includes(query));
      const statusMatch = selectedCaseStatuses.length === 0 || selectedCaseStatuses.includes(String(resident.caseStatus ?? ''));
      const categoryMatch = selectedCaseCategories.length === 0 || selectedCaseCategories.includes(String(resident.caseCategory ?? ''));
      const safehouseMatch = selectedSafehouses.length === 0 || selectedSafehouses.includes(String(resident.safehouseId ?? ''));
      const riskMatch = selectedRiskLevels.length === 0 || selectedRiskLevels.includes(String(resident.currentRiskLevel ?? ''));
      return searchMatch && statusMatch && categoryMatch && safehouseMatch && riskMatch;
    });
  }, [residents, search, selectedCaseStatuses, selectedCaseCategories, selectedSafehouses, selectedRiskLevels]);

  const sortedResidents = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredResidents].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortKey) {
        case 'residentId':
          av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'internalCode':
          av = String(a.internalCode ?? '').toLowerCase(); bv = String(b.internalCode ?? '').toLowerCase(); break;
        case 'safehouseId':
          av = a.safehouseId ?? 0; bv = b.safehouseId ?? 0; break;
        case 'caseStatus':
          av = String(a.caseStatus ?? '').toLowerCase(); bv = String(b.caseStatus ?? '').toLowerCase(); break;
        case 'sex':
          av = String(a.sex ?? '').toLowerCase(); bv = String(b.sex ?? '').toLowerCase(); break;
        case 'caseCategory':
          av = String(a.caseCategory ?? '').toLowerCase(); bv = String(b.caseCategory ?? '').toLowerCase(); break;
        case 'currentRiskLevel':
          av = String(a.currentRiskLevel ?? '').toLowerCase(); bv = String(b.currentRiskLevel ?? '').toLowerCase(); break;
        case 'assignedSocialWorker':
          av = String(a.assignedSocialWorker ?? '').toLowerCase(); bv = String(b.assignedSocialWorker ?? '').toLowerCase(); break;
        case 'dateOfAdmission':
          av = Date.parse(String(a.dateOfAdmission ?? '')) || 0; bv = Date.parse(String(b.dateOfAdmission ?? '')) || 0; break;
        case 'mlPredictionStatus':
          av = String(a.mlPredictionStatus ?? '').toLowerCase(); bv = String(b.mlPredictionStatus ?? '').toLowerCase(); break;
        default:
          av = 0; bv = 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredResidents, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedResidents.length / pageSize));
  const pagedResidents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedResidents.slice(start, start + pageSize);
  }, [sortedResidents, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedCaseStatuses, selectedCaseCategories, selectedSafehouses, selectedRiskLevels, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  function sortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  }
  const sexOptions = buildSelectOptions(SEX_OPTIONS, residents.map((resident) => String(resident.sex ?? '')), String(editingResident?.sex ?? ''));
  const caseCategoryOptions = buildSelectOptions(CASE_CATEGORY_OPTIONS, caseCategories, String(editingResident?.caseCategory ?? ''));
  const birthStatusOptions = buildSelectOptions(BIRTH_STATUS_OPTIONS, residents.map((resident) => String(resident.birthStatus ?? '')), String(editingResident?.birthStatus ?? ''));

  return (
    <div className="container mt-4 residents-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Residents</h2>
        {isAdmin && (
          <div className="mobile-page-actions">
            <button className="btn btn-primary btn-sm" onClick={handleNew}>+ Add Resident</button>
          </div>
        )}
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Search</label>
                <input
                  type="text"
                  className="form-control form-control-sm mb-3"
                  placeholder="Code, worker, category, referral..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="small text-muted fw-semibold mb-1">Case Status</div>
                <div className="mb-3">
                  {caseStatuses.map((status) => (
                    <div className="form-check" key={`status-${status}`}>
                      <input className="form-check-input" type="checkbox" id={`status-${status}`} checked={selectedCaseStatuses.includes(status)} onChange={() => toggleSelection(setSelectedCaseStatuses, status)} />
                      <label className="form-check-label small" htmlFor={`status-${status}`}>{status}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Case Category</div>
                <div className="mb-3">
                  {caseCategories.map((category) => (
                    <div className="form-check" key={`category-${category}`}>
                      <input className="form-check-input" type="checkbox" id={`category-${category}`} checked={selectedCaseCategories.includes(category)} onChange={() => toggleSelection(setSelectedCaseCategories, category)} />
                      <label className="form-check-label small" htmlFor={`category-${category}`}>{category}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Safehouse</div>
                <div className="mb-3">
                  {safehouses.map((safehouse) => {
                    const idValue = String(safehouse.safehouseId);
                    return (
                      <div className="form-check" key={`safehouse-${safehouse.safehouseId}`}>
                        <input className="form-check-input" type="checkbox" id={`safehouse-${safehouse.safehouseId}`} checked={selectedSafehouses.includes(idValue)} onChange={() => toggleSelection(setSelectedSafehouses, idValue)} />
                        <label className="form-check-label small" htmlFor={`safehouse-${safehouse.safehouseId}`}>
                          {safehouse.safehouseCode ?? safehouse.safehouseId} - {safehouse.name ?? 'Unnamed safehouse'}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="small text-muted fw-semibold mb-1">Risk Level</div>
                <div className="mb-3">
                  {riskLevels.map((riskLevel) => (
                    <div className="form-check" key={`risk-${riskLevel}`}>
                      <input className="form-check-input" type="checkbox" id={`risk-${riskLevel}`} checked={selectedRiskLevels.includes(riskLevel)} onChange={() => toggleSelection(setSelectedRiskLevels, riskLevel)} />
                      <label className="form-check-label small" htmlFor={`risk-${riskLevel}`}>{riskLevel}</label>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setSelectedCaseStatuses([]);
                    setSelectedCaseCategories([]);
                    setSelectedSafehouses([]);
                    setSelectedRiskLevels([]);
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th role="button" onClick={() => toggleSort('residentId')}>ID{sortIndicator('residentId')}</th>
                  <th role="button" onClick={() => toggleSort('internalCode')}>Code{sortIndicator('internalCode')}</th>
                  <th role="button" onClick={() => toggleSort('safehouseId')}>Safehouse{sortIndicator('safehouseId')}</th>
                  <th role="button" onClick={() => toggleSort('caseStatus')}>Status{sortIndicator('caseStatus')}</th>
                  <th role="button" onClick={() => toggleSort('sex')}>Sex{sortIndicator('sex')}</th>
                  <th role="button" onClick={() => toggleSort('caseCategory')}>Category{sortIndicator('caseCategory')}</th>
                  <th role="button" onClick={() => toggleSort('currentRiskLevel')}>Risk Level{sortIndicator('currentRiskLevel')}</th>
                  <th role="button" onClick={() => toggleSort('assignedSocialWorker')}>Social Worker{sortIndicator('assignedSocialWorker')}</th>
                  <th role="button" onClick={() => toggleSort('dateOfAdmission')}>Admitted{sortIndicator('dateOfAdmission')}</th>
                  <th role="button" onClick={() => toggleSort('mlPredictionStatus')}>Progress{sortIndicator('mlPredictionStatus')}</th>
                  <th className="text-center">Checked On</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pagedResidents.map((r) => (
                  <tr key={r.residentId}>
                    <td>{r.residentId}</td>
                    <td><code>{r.internalCode}</code></td>
                    <td>{safehouseLabel(r.safehouseId)}</td>
                    <td>
                      <span className={`badge ${r.caseStatus === 'Active' ? 'text-bg-success' : r.caseStatus === 'Closed' ? 'text-bg-secondary' : 'text-bg-warning'}`}>
                        {r.caseStatus}
                      </span>
                    </td>
                    <td>{r.sex}</td>
                    <td>{r.caseCategory}</td>
                    <td>
                      <span className={`badge ${r.currentRiskLevel === 'Critical' ? 'text-bg-danger' : r.currentRiskLevel === 'High' ? 'text-bg-warning' : r.currentRiskLevel === 'Medium' ? 'text-bg-info' : 'text-bg-success'}`}>
                        {r.currentRiskLevel}
                      </span>
                    </td>
                    <td>{r.assignedSocialWorker}</td>
                    <td>{r.dateOfAdmission}</td>
                    <td>
                      {r.mlPredictionStatus ? (
                        <span className={`badge ${r.mlPredictionStatus === 'Stalling' ? 'text-bg-danger' : 'text-bg-primary'} bg-opacity-75`}>
                          {r.mlPredictionStatus === 'Progressing' ? 'OK' : r.mlPredictionStatus}
                        </span>
                      ) : (
                        <span className="text-muted small">Pending</span>
                      )}
                    </td>
                    <td className="text-center align-middle">
                      <input type="checkbox" className="form-check-input d-block mx-auto mt-0" aria-label="Checked on Resident" />
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEdit(r)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(r.residentId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-2 mb-4 gap-2 flex-wrap">
            <small className="text-muted">{filteredResidents.length} residents total</small>
            <div className="d-flex gap-2 align-items-center">
              <label className="small text-muted mb-0">Per page</label>
              <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="small text-muted">Page {page} of {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && editingResident && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingResident.residentId ? 'Edit Resident' : 'Add Resident'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Internal Code</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.internalCode ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, internalCode: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Case Control No</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.caseControlNo ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, caseControlNo: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Case Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.caseStatus ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, caseStatus: e.target.value } : prev)}
                    >
                      <option value="">Select status...</option>
                      {CASE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Case Category</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.caseCategory ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, caseCategory: e.target.value } : prev)}
                    >
                      <option value="">Select category...</option>
                      {caseCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Sex</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.sex ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, sex: e.target.value } : prev)}
                    >
                      <option value="">Select sex...</option>
                      {sexOptions.map((sexOption) => <option key={sexOption} value={sexOption}>{sexOption}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date of Birth</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateOfBirth ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateOfBirth: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Birth Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.birthStatus ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, birthStatus: e.target.value } : prev)}
                    >
                      <option value="">Select birth status...</option>
                      {birthStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Case Sub-Categories</label>
                    <div className="row g-2">
                      {[
                        ['subCatTrafficked', 'Trafficked'],
                        ['subCatPhysicalAbuse', 'Victim of Physical Abuse'],
                        ['subCatSexualAbuse', 'Victim of Sexual Abuse'],
                        ['subCatOrphaned', 'Orphaned'],
                        ['subCatChildLabor', 'Child Labor'],
                        ['subCatAtRisk', 'At Risk'],
                        ['subCatStreetChild', 'Street Child'],
                        ['subCatOsaec', 'OSAEC'],
                        ['subCatCicl', 'CICL'],
                        ['subCatChildWithHiv', 'Child with HIV']
                      ].map(([key, label]) => (
                        <div className="col-md-4" key={key}>
                          <div className="form-check">
                            <input
                              id={key}
                              type="checkbox"
                              className="form-check-input"
                              checked={Boolean(editingResident[key])}
                              onChange={(e) => setEditingResident(prev => prev ? { ...prev, [key]: e.target.checked } : prev)}
                            />
                            <label className="form-check-label small" htmlFor={key}>{label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Place of Birth</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.placeOfBirth ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, placeOfBirth: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Religion</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.religion ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, religion: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Disability / Special Needs</label>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-check mt-1">
                          <input
                            id="isPwd"
                            type="checkbox"
                            className="form-check-input"
                            checked={Boolean(editingResident.isPwd)}
                            onChange={(e) => setEditingResident(prev => prev ? { ...prev, isPwd: e.target.checked } : prev)}
                          />
                          <label className="form-check-label small" htmlFor="isPwd">Person With Disability</label>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="form-check mt-1">
                          <input
                            id="hasSpecialNeeds"
                            type="checkbox"
                            className="form-check-input"
                            checked={Boolean(editingResident.hasSpecialNeeds)}
                            onChange={(e) => setEditingResident(prev => prev ? { ...prev, hasSpecialNeeds: e.target.checked } : prev)}
                          />
                          <label className="form-check-label small" htmlFor="hasSpecialNeeds">Has Special Needs</label>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small">PWD Type</label>
                        <input
                          type="text" className="form-control form-control-sm"
                          value={String(editingResident.pwdType ?? '')}
                          onChange={(e) => setEditingResident(prev => prev ? { ...prev, pwdType: e.target.value } : prev)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small">Special Needs Diagnosis</label>
                        <input
                          type="text" className="form-control form-control-sm"
                          value={String(editingResident.specialNeedsDiagnosis ?? '')}
                          onChange={(e) => setEditingResident(prev => prev ? { ...prev, specialNeedsDiagnosis: e.target.value } : prev)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Risk Level</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.currentRiskLevel ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, currentRiskLevel: e.target.value } : prev)}
                    >
                      <option value="">Select risk level...</option>
                      {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Initial Risk Level</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.initialRiskLevel ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, initialRiskLevel: e.target.value } : prev)}
                    >
                      <option value="">Select risk level...</option>
                      {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Safehouse</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.safehouseId ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, safehouseId: Number(e.target.value) || undefined } : prev)}
                    >
                      <option value="">Select safehouse...</option>
                      {safehouses.map((s) => <option key={s.safehouseId} value={s.safehouseId}>{s.safehouseId} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Family Socio-Demographic Profile</label>
                    <div className="row g-2">
                      {[
                        ['familyIs4ps', '4Ps beneficiary'],
                        ['familySoloParent', 'Solo parent household'],
                        ['familyIndigenous', 'Indigenous group'],
                        ['familyInformalSettler', 'Informal settler'],
                        ['familyParentPwd', 'Parent/guardian is PWD']
                      ].map(([key, label]) => (
                        <div className="col-md-4" key={key}>
                          <div className="form-check">
                            <input
                              id={key}
                              type="checkbox"
                              className="form-check-input"
                              checked={Boolean(editingResident[key])}
                              onChange={(e) => setEditingResident(prev => prev ? { ...prev, [key]: e.target.checked } : prev)}
                            />
                            <label className="form-check-label small" htmlFor={key}>{label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Social Worker</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.assignedSocialWorker ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, assignedSocialWorker: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Referral Source</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.referralSource ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, referralSource: e.target.value } : prev)}
                    >
                      <option value="">Select referral source...</option>
                      {REFERRAL_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Referring Agency / Person</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingResident.referringAgencyPerson ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, referringAgencyPerson: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date of Admission</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateOfAdmission ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateOfAdmission: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date COLB Registered</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateColbRegistered ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateColbRegistered: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date COLB Obtained</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateColbObtained ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateColbObtained: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Age Upon Admission</label>
                    <div className="border rounded p-2 small fw-semibold">
                      {computeAge(String(editingResident.dateOfBirth ?? ''), String(editingResident.dateOfAdmission ?? '')) || '—'}
                    </div>
                    <small className="form-text">Calculated from Date of Birth and Admission Date</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Present Age</label>
                    <div className="border rounded p-2 small fw-semibold">
                      {computeAge(String(editingResident.dateOfBirth ?? '')) || '—'}
                    </div>
                    <small className="form-text">Calculated from Date of Birth and current date</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Length of Stay</label>
                    <div className="border rounded p-2 small fw-semibold">
                      {computeLengthOfStay(String(editingResident.dateOfAdmission ?? ''), String(editingResident.dateClosed ?? '')) || '—'}
                    </div>
                    <small className="form-text">Calculated from Admission Date to Closed Date (or today)</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Reintegration Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.reintegrationStatus ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, reintegrationStatus: e.target.value } : prev)}
                    >
                      <option value="">Select status...</option>
                      {REINTEGRATION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Reintegration Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingResident.reintegrationType ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, reintegrationType: e.target.value } : prev)}
                    >
                      <option value="">Select reintegration type...</option>
                      {REINTEGRATION_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date Enrolled</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateEnrolled ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateEnrolled: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date Case Study Prepared</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateCaseStudyPrepared ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateCaseStudyPrepared: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date Closed</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingResident.dateClosed ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, dateClosed: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Initial Case Assessment</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={String(editingResident.initialCaseAssessment ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, initialCaseAssessment: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Notes Restricted</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={String(editingResident.notesRestricted ?? '')}
                      onChange={(e) => setEditingResident(prev => prev ? { ...prev, notesRestricted: e.target.value } : prev)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResidentsPage;
