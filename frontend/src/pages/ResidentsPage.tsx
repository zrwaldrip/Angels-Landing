import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getResidents,
  getResidentFilterOptions,
  createResident,
  updateResident,
  deleteResident,
  type Resident,
} from '../lib/lighthouseAPI';

function ResidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [search, setSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [caseStatuses, setCaseStatuses] = useState<string[]>([]);
  const [riskLevels, setRiskLevels] = useState<string[]>([]);

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
  }, [isAuthenticated, isLoading, page, search, caseStatusFilter, riskLevelFilter]);

  async function loadFilterOptions() {
    try {
      const opts = await getResidentFilterOptions();
      setCaseStatuses(opts.caseStatuses);
      setRiskLevels(opts.riskLevels);
    } catch { /* ignore */ }
  }

  async function loadResidents() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      if (caseStatusFilter) params.caseStatus = caseStatusFilter;
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
      if (editingResident.residentId) {
        await updateResident(editingResident.residentId, editingResident);
      } else {
        await createResident(editingResident);
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

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-warning">Please <Link to="/login">sign in</Link> to view residents.</div>
      </div>
    );
  }

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
            type="text" className="form-control form-control-sm" placeholder="Search by code or worker..."
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
                    <td>{r.safehouseId}</td>
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
                  {[
                    ['internalCode', 'Internal Code'], ['caseControlNo', 'Case Control No'],
                    ['caseStatus', 'Case Status'], ['sex', 'Sex'],
                    ['caseCategory', 'Case Category'], ['currentRiskLevel', 'Risk Level'],
                    ['assignedSocialWorker', 'Social Worker'], ['safehouseId', 'Safehouse ID'],
                    ['dateOfAdmission', 'Date of Admission'], ['reintegrationStatus', 'Reintegration Status'],
                  ].map(([field, label]) => (
                    <div className="col-md-6" key={field}>
                      <label className="form-label small">{label}</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        value={String(editingResident[field] ?? '')}
                        onChange={(e) => setEditingResident(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                      />
                    </div>
                  ))}
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
