import { useEffect, useState } from 'react';
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

const SEX_OPTIONS = ['Female'] as const;
const CASE_STATUS_OPTIONS = ['Active', 'On Hold', 'Reintegrated', 'Transferred', 'Closed'] as const;
const CASE_CATEGORY_OPTIONS = [
  'Abandoned',
  'Neglected',
  'Physically Abused',
  'Sexually Abused',
  'Trafficked',
  'Child Laborer',
  'Street Child',
  'Child With HIV',
  'OSAEC',
  'CICL',
  'At Risk',
  'Other',
] as const;
const BIRTH_STATUS_OPTIONS = ['Legitimate', 'Illegitimate', 'Unknown'] as const;
const REFERRAL_SOURCE_OPTIONS = [
  'WCPD',
  'DSWD',
  'LGU',
  'Barangay',
  'School',
  'Hospital',
  'Court',
  'NGO',
  'Walk-in',
  'Other',
] as const;
const REINTEGRATION_TYPE_OPTIONS = [
  'Family Reintegration',
  'Independent Living',
  'Transfer to Another Facility',
  'Foster Care',
  'Adoption',
  'Not Yet Planned',
] as const;
const REINTEGRATION_STATUS_OPTIONS = ['Active', 'Pending', 'Completed', 'At Risk', 'Discontinued'] as const;

function ResidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState('');
  const [safehouseFilter, setSafehouseFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [caseStatuses, setCaseStatuses] = useState<string[]>([]);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [caseCategories, setCaseCategories] = useState<string[]>([]);

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
  }, [isAuthenticated, isLoading, page, search, caseStatusFilter, caseCategoryFilter, safehouseFilter, riskLevelFilter]);

  async function loadFilterOptions() {
    try {
      const opts = await getResidentFilterOptions();
      setCaseStatuses(opts.caseStatuses);
      setRiskLevels(opts.riskLevels);
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
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      if (caseStatusFilter) params.caseStatus = caseStatusFilter;
      if (caseCategoryFilter) params.caseCategory = caseCategoryFilter;
      if (safehouseFilter) params.safehouseId = Number(safehouseFilter);
      if (riskLevelFilter) params.riskLevel = riskLevelFilter;
      const result = await getResidents(params);
      setResidents(result.items);
      setTotal(result.total);
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Residents</h2>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={handleNew}>+ Add Resident</button>
        )}
      </div>

      {/* Filters */}
      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            type="text" className="form-control form-control-sm" placeholder="Search code, worker, category, referral..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={caseStatusFilter}
            onChange={(e) => { setCaseStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {caseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={caseCategoryFilter}
            onChange={(e) => { setCaseCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All case categories</option>
            {caseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={safehouseFilter}
            onChange={(e) => { setSafehouseFilter(e.target.value); setPage(1); }}>
            <option value="">All safehouses</option>
            {safehouses.map((safehouse) => (
              <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                {safehouse.safehouseCode ?? safehouse.safehouseId} - {safehouse.name ?? 'Unnamed safehouse'}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={riskLevelFilter}
            onChange={(e) => { setRiskLevelFilter(e.target.value); setPage(1); }}>
            <option value="">All risk levels</option>
            {riskLevels.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Safehouse</th>
                  <th>Status</th>
                  <th>Sex</th>
                  <th>Category</th>
                  <th>Risk Level</th>
                  <th>Social Worker</th>
                  <th>Admitted</th>
                  <th>Progress</th>
                  <th>Checked On</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {residents.map((r) => (
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
                          {r.mlPredictionStatus}
                        </span>
                      ) : (
                        <span className="text-muted small">Pending</span>
                      )}
                    </td>
                    <td className="text-center">
                      <input type="checkbox" className="form-check-input" aria-label="Checked on Resident" />
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
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">{total} residents total</small>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="btn btn-sm disabled">Page {page} of {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </>
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
                      {CASE_CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
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
                      {SEX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
                      {BIRTH_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
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
                    <label className="form-label small">Case Sub-categories</label>
                    <div className="row g-2">
                      {[
                        ['subCatTrafficked', 'Trafficked'],
                        ['subCatPhysicalAbuse', 'Physical Abuse'],
                        ['subCatSexualAbuse', 'Sexual Abuse'],
                        ['subCatChildLabor', 'Child Labor'],
                        ['subCatOrphaned', 'Orphaned'],
                        ['subCatAtRisk', 'At Risk'],
                        ['subCatStreetChild', 'Street Child'],
                        ['subCatChildWithHiv', 'Child With HIV'],
                        ['subCatOsaec', 'OSAEC'],
                        ['subCatCicl', 'CICL'],
                      ].map(([field, label]) => (
                        <div className="col-md-6" key={field}>
                          <div className="form-check mt-1">
                            <input
                              id={field}
                              type="checkbox"
                              className="form-check-input"
                              checked={Boolean(editingResident[field as keyof Resident])}
                              onChange={(e) => setEditingResident(prev => prev ? { ...prev, [field]: e.target.checked } : prev)}
                            />
                            <label className="form-check-label small" htmlFor={field}>{label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
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
                  <div className="col-12">
                    <label className="form-label small">Family Socio-demographic Profile</label>
                    <div className="row g-2">
                      {[
                        ['familyIs4ps', '4Ps Beneficiary'],
                        ['familySoloParent', 'Solo Parent'],
                        ['familyIndigenous', 'Indigenous Group'],
                        ['familyParentPwd', 'Parent/PWD in Family'],
                        ['familyInformalSettler', 'Informal Settler'],
                      ].map(([field, label]) => (
                        <div className="col-md-6" key={field}>
                          <div className="form-check mt-1">
                            <input
                              id={field}
                              type="checkbox"
                              className="form-check-input"
                              checked={Boolean(editingResident[field as keyof Resident])}
                              onChange={(e) => setEditingResident(prev => prev ? { ...prev, [field]: e.target.checked } : prev)}
                            />
                            <label className="form-check-label small" htmlFor={field}>{label}</label>
                          </div>
                        </div>
                      ))}
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
