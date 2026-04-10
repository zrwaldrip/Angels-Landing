import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getSafehouses, getSafehouseMetrics, createSafehouse, updateSafehouse, deleteSafehouse, createSafehouseMetric, updateSafehouseMetric, deleteSafehouseMetric, type Safehouse, type SafehouseMetric } from '../lib/lighthouseAPI';

const SAFEHOUSE_STATUS_OPTIONS = ['Active', 'Inactive'] as const;
const SAFEHOUSE_REGION_OPTIONS = ['Luzon', 'Visayas', 'Mindanao'] as const;

function SafehousesPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [metrics, setMetrics] = useState<SafehouseMetric[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingSafehouse, setEditingSafehouse] = useState<Partial<Safehouse> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [showMetricModal, setShowMetricModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Partial<SafehouseMetric> | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [saveMetricError, setSaveMetricError] = useState('');
  const [metricSearch, setMetricSearch] = useState('');
  const [metricIncidentFilters, setMetricIncidentFilters] = useState<string[]>([]);
  const [metricSortKey, setMetricSortKey] = useState<'monthStart' | 'activeResidents' | 'avgHealthScore' | 'avgEducationProgress' | 'processRecordingCount' | 'homeVisitationCount' | 'incidentCount'>('monthStart');
  const [metricSortDirection, setMetricSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void load();
  }, [isAuthenticated, isLoading]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const sh = await getSafehouses();
      setSafehouses(sh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load safehouses.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics(id: number) {
    setSelectedId(id);
    try {
      const m = await getSafehouseMetrics(id);
      setMetrics(m);
    } catch { setMetrics([]); }
  }

  function handleEditSafehouse(safehouse: Safehouse) {
    setEditingSafehouse({ ...safehouse });
    setSaveError('');
    setShowModal(true);
  }

  function handleNewSafehouse() {
    setEditingSafehouse({});
    setSaveError('');
    setShowModal(true);
  }

  async function handleSaveSafehouse() {
    if (!editingSafehouse) return;
    setSaving(true);
    setSaveError('');
    try {
      if (editingSafehouse.safehouseId) {
        await updateSafehouse(editingSafehouse.safehouseId, editingSafehouse);
      } else {
        await createSafehouse(editingSafehouse);
      }
      setShowModal(false);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSafehouse(id: number) {
    if (!confirm('Delete this safehouse?')) return;
    try {
      await deleteSafehouse(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  function handleEditMetric(metric: SafehouseMetric) {
    setEditingMetric({ ...metric });
    setSaveMetricError('');
    setShowMetricModal(true);
  }

  function handleNewMetric() {
    setEditingMetric({ safehouseId: selectedId ?? undefined });
    setSaveMetricError('');
    setShowMetricModal(true);
  }

  async function handleSaveMetric() {
    if (!editingMetric) return;
    setSavingMetric(true);
    setSaveMetricError('');
    try {
      if (editingMetric.metricId) {
        await updateSafehouseMetric(editingMetric.metricId, editingMetric);
      } else {
        await createSafehouseMetric(editingMetric);
      }
      setShowMetricModal(false);
      if (selectedId) await loadMetrics(selectedId);
    } catch (e) {
      setSaveMetricError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingMetric(false);
    }
  }

  async function handleDeleteMetric(id: number) {
    if (!confirm('Delete this metric?')) return;
    try {
      await deleteSafehouseMetric(id);
      if (selectedId) await loadMetrics(selectedId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  const filteredMetrics = useMemo(() => {
    const query = metricSearch.trim().toLowerCase();
    return metrics.filter((metric) => {
      const searchMatch = !query || [
        metric.monthStart,
        String(metric.activeResidents ?? ''),
        String(metric.processRecordingCount ?? ''),
      ].some((value) => String(value ?? '').toLowerCase().includes(query));
      const incidentBucket = (metric.incidentCount ?? 0) > 0 ? 'hasIncidents' : 'noIncidents';
      const incidentMatch = metricIncidentFilters.length === 0 || metricIncidentFilters.includes(incidentBucket);
      return searchMatch && incidentMatch;
    });
  }, [metrics, metricSearch, metricIncidentFilters]);
  const sortedMetrics = useMemo(() => {
    const dir = metricSortDirection === 'asc' ? 1 : -1;
    return [...filteredMetrics].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (metricSortKey) {
        case 'monthStart':
          av = Date.parse(String(a.monthStart ?? '')) || 0; bv = Date.parse(String(b.monthStart ?? '')) || 0; break;
        case 'activeResidents':
          av = a.activeResidents ?? 0; bv = b.activeResidents ?? 0; break;
        case 'avgHealthScore':
          av = a.avgHealthScore ?? 0; bv = b.avgHealthScore ?? 0; break;
        case 'avgEducationProgress':
          av = a.avgEducationProgress ?? 0; bv = b.avgEducationProgress ?? 0; break;
        case 'processRecordingCount':
          av = a.processRecordingCount ?? 0; bv = b.processRecordingCount ?? 0; break;
        case 'homeVisitationCount':
          av = a.homeVisitationCount ?? 0; bv = b.homeVisitationCount ?? 0; break;
        case 'incidentCount':
          av = a.incidentCount ?? 0; bv = b.incidentCount ?? 0; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredMetrics, metricSortDirection, metricSortKey]);

  function toggleMetricSort(key: typeof metricSortKey) {
    if (metricSortKey === key) {
      setMetricSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setMetricSortKey(key);
    setMetricSortDirection('asc');
  }

  function metricSortIndicator(key: typeof metricSortKey) {
    if (metricSortKey !== key) return '';
    return metricSortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Safehouses</h2>
        {isAdmin && (
          <div className="mobile-page-actions">
            <button className="btn btn-primary btn-sm" onClick={handleNewSafehouse}>+ Add Safehouse</button>
          </div>
        )}
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="row g-3">
          {safehouses.map((sh) => (
            <div className="col-md-6 col-lg-4" key={sh.safehouseId}>
              <div className={`card shadow-sm h-100 ${selectedId === sh.safehouseId ? 'border-primary' : ''}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{sh.name}</h5>
                    <span className={`badge ${sh.status === 'Active' ? 'text-bg-success' : 'text-bg-secondary'}`}>{sh.status}</span>
                  </div>
                  <p className="text-muted small mb-1">{sh.city}, {sh.province}, {sh.country}</p>
                  <p className="text-muted small mb-2">{sh.region} • Code: {sh.safehouseCode}</p>
                  <div className="row text-center g-2 mb-3">
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.currentOccupancy ?? 0}</div>
                        <small className="text-muted">Residents</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.capacityGirls ?? 0}</div>
                        <small className="text-muted">Capacity</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="bg-light rounded p-2">
                        <div className="fw-bold">{sh.capacityStaff ?? 0}</div>
                        <small className="text-muted">Staff Cap</small>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline-primary btn-sm w-100"
                    onClick={() => loadMetrics(sh.safehouseId)}
                  >
                    {selectedId === sh.safehouseId ? 'Metrics loaded ↓' : 'View monthly metrics'}
                  </button>
                  {isAdmin && (
                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => handleEditSafehouse(sh)}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteSafehouse(sh.safehouseId)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly metrics panel */}
      {selectedId && metrics.length > 0 && (
        <div className="mt-4">
          <h3 className="h5">
            Monthly Metrics — {safehouses.find(s => s.safehouseId === selectedId)?.name}
            <button className="btn btn-link btn-sm ms-2" onClick={() => { setSelectedId(null); setMetrics([]); }}>
              Close
            </button>
            {isAdmin && (
              <button className="btn btn-primary btn-sm ms-2" onClick={handleNewMetric}>+ Add Metric</button>
            )}
          </h3>
          <div className="row g-3">
            <div className="col-lg-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h6 className="mb-3">Metric Filters</h6>
                  <input
                    type="text"
                    className="form-control form-control-sm mb-3"
                    placeholder="Search month or counts..."
                    value={metricSearch}
                    onChange={(e) => setMetricSearch(e.target.value)}
                  />
                  <div className="small text-muted fw-semibold mb-1">Incident Presence</div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="metric-has-incidents" checked={metricIncidentFilters.includes('hasIncidents')} onChange={() => toggleSelection(setMetricIncidentFilters, 'hasIncidents')} />
                    <label className="form-check-label small" htmlFor="metric-has-incidents">Has incidents</label>
                  </div>
                  <div className="form-check mb-3">
                    <input className="form-check-input" type="checkbox" id="metric-no-incidents" checked={metricIncidentFilters.includes('noIncidents')} onChange={() => toggleSelection(setMetricIncidentFilters, 'noIncidents')} />
                    <label className="form-check-label small" htmlFor="metric-no-incidents">No incidents</label>
                  </div>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => { setMetricSearch(''); setMetricIncidentFilters([]); }}>Clear Filters</button>
                </div>
              </div>
            </div>
            <div className="col-lg-9">
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th role="button" onClick={() => toggleMetricSort('monthStart')}>Month{metricSortIndicator('monthStart')}</th>
                  <th role="button" onClick={() => toggleMetricSort('activeResidents')}>Active Residents{metricSortIndicator('activeResidents')}</th>
                  <th role="button" onClick={() => toggleMetricSort('avgHealthScore')}>Avg Health{metricSortIndicator('avgHealthScore')}</th>
                  <th role="button" onClick={() => toggleMetricSort('avgEducationProgress')}>Avg Education{metricSortIndicator('avgEducationProgress')}</th>
                  <th role="button" onClick={() => toggleMetricSort('processRecordingCount')}>Process Recordings{metricSortIndicator('processRecordingCount')}</th>
                  <th role="button" onClick={() => toggleMetricSort('homeVisitationCount')}>Home Visitations{metricSortIndicator('homeVisitationCount')}</th>
                  <th role="button" onClick={() => toggleMetricSort('incidentCount')}>Incidents{metricSortIndicator('incidentCount')}</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((m) => (
                  <tr key={m.metricId}>
                    <td>{m.monthStart}</td>
                    <td>{m.activeResidents}</td>
                    <td>{m.avgHealthScore?.toFixed(1)}</td>
                    <td>{m.avgEducationProgress?.toFixed(1)}%</td>
                    <td>{m.processRecordingCount}</td>
                    <td>{m.homeVisitationCount}</td>
                    <td>{m.incidentCount}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditMetric(m)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteMetric(m.metricId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </div>
          </div>
        </div>
      )}
    {/* Safehouse Modal */}
    {showModal && editingSafehouse && (
      <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingSafehouse.safehouseId ? 'Edit Safehouse' : 'Add Safehouse'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <div className="modal-body">
              {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Code</label>
                  <input type="text" className="form-control form-control-sm"
                    value={String(editingSafehouse.safehouseCode ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, safehouseCode: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Name</label>
                  <input type="text" className="form-control form-control-sm"
                    value={String(editingSafehouse.name ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, name: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Region</label>
                  <select className="form-select form-select-sm"
                    value={String(editingSafehouse.region ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, region: e.target.value } : prev)}>
                    <option value="">Select region...</option>
                    {SAFEHOUSE_REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">City</label>
                  <input type="text" className="form-control form-control-sm"
                    value={String(editingSafehouse.city ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, city: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Province</label>
                  <input type="text" className="form-control form-control-sm"
                    value={String(editingSafehouse.province ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, province: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Country</label>
                  <input type="text" className="form-control form-control-sm"
                    value={String(editingSafehouse.country ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, country: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Status</label>
                  <select className="form-select form-select-sm"
                    value={String(editingSafehouse.status ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, status: e.target.value } : prev)}>
                    <option value="">Select status...</option>
                    {SAFEHOUSE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Open Date</label>
                  <input type="date" className="form-control form-control-sm"
                    value={String(editingSafehouse.openDate ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, openDate: e.target.value } : prev)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Capacity Girls</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingSafehouse.capacityGirls ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, capacityGirls: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Capacity Staff</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingSafehouse.capacityStaff ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, capacityStaff: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small">Current Occupancy</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingSafehouse.currentOccupancy ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, currentOccupancy: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-12">
                  <label className="form-label small">Notes</label>
                  <textarea className="form-control form-control-sm" rows={2}
                    value={String(editingSafehouse.notes ?? '')}
                    onChange={(e) => setEditingSafehouse(prev => prev ? { ...prev, notes: e.target.value } : prev)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSafehouse} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Metric Modal */}
    {showMetricModal && editingMetric && (
      <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingMetric.metricId ? 'Edit Metric' : 'Add Metric'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowMetricModal(false)} />
            </div>
            <div className="modal-body">
              {saveMetricError ? <div className="alert alert-danger">{saveMetricError}</div> : null}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Month Start</label>
                  <input type="date" className="form-control form-control-sm"
                    value={String(editingMetric.monthStart ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, monthStart: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Month End</label>
                  <input type="date" className="form-control form-control-sm"
                    value={String(editingMetric.monthEnd ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, monthEnd: e.target.value } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Active Residents</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingMetric.activeResidents ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, activeResidents: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Avg Health Score</label>
                  <input type="number" step="0.1" className="form-control form-control-sm"
                    value={String(editingMetric.avgHealthScore ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, avgHealthScore: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Avg Education Progress %</label>
                  <input type="number" step="0.1" className="form-control form-control-sm"
                    value={String(editingMetric.avgEducationProgress ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, avgEducationProgress: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Process Recording Count</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingMetric.processRecordingCount ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, processRecordingCount: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Home Visitation Count</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingMetric.homeVisitationCount ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, homeVisitationCount: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Incident Count</label>
                  <input type="number" className="form-control form-control-sm"
                    value={String(editingMetric.incidentCount ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, incidentCount: Number(e.target.value) || undefined } : prev)} />
                </div>
                <div className="col-12">
                  <label className="form-label small">Notes</label>
                  <textarea className="form-control form-control-sm" rows={2}
                    value={String(editingMetric.notes ?? '')}
                    onChange={(e) => setEditingMetric(prev => prev ? { ...prev, notes: e.target.value } : prev)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowMetricModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveMetric} disabled={savingMetric}>
                {savingMetric ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

export default SafehousesPage;
