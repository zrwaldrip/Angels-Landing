import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import {
  createHomeVisitation,
  createInterventionPlan,
  deleteHomeVisitation,
  deleteInterventionPlan,
  getHomeVisitations,
  getInterventionPlans,
  updateHomeVisitation,
  updateInterventionPlan,
  type HomeVisitation,
  type InterventionPlan,
} from '../lib/lighthouseAPI';

type Tab = 'visitations' | 'conferences';

const VISIT_TYPES = ['Initial Assessment', 'Routine Follow-up', 'Reintegration Assessment', 'Post-placement Monitoring', 'Emergency'] as const;
const COOP_LEVELS = ['Low', 'Moderate', 'High'] as const;

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export default function HomeVisitationCaseConferencePage() {
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<Tab>('visitations');
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [visitSortKey, setVisitSortKey] = useState<'visitDate' | 'residentId' | 'socialWorker' | 'visitType' | 'familyCooperationLevel' | 'safetyConcernsNoted' | 'followUpNeeded'>('visitDate');
  const [visitSortDirection, setVisitSortDirection] = useState<'asc' | 'desc'>('desc');
  const [conferenceSortKey, setConferenceSortKey] = useState<'date' | 'residentId' | 'planCategory' | 'status' | 'planDescription'>('date');
  const [conferenceSortDirection, setConferenceSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [plans, setPlans] = useState<InterventionPlan[]>([]);

  const [showVisitationModal, setShowVisitationModal] = useState(false);
  const [editingVisitation, setEditingVisitation] = useState<Partial<HomeVisitation> | null>(null);
  const [showConferenceModal, setShowConferenceModal] = useState(false);
  const [editingConference, setEditingConference] = useState<Partial<InterventionPlan> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [visitationData, planData] = await Promise.all([getHomeVisitations(), getInterventionPlans()]);
      const rawVisitations = Array.isArray(visitationData)
        ? visitationData
        : Array.isArray((visitationData as { items?: HomeVisitation[] })?.items)
          ? (visitationData as { items: HomeVisitation[] }).items
          : [];
      const rawPlans = Array.isArray(planData)
        ? planData
        : Array.isArray((planData as { items?: InterventionPlan[] })?.items)
          ? (planData as { items: InterventionPlan[] }).items
          : [];
      const normalizedVisitations = rawVisitations.filter(isRecordObject) as HomeVisitation[];
      const normalizedPlans = rawPlans.filter(isRecordObject) as InterventionPlan[];

      setVisitations(normalizedVisitations);
      setPlans(normalizedPlans);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load home visitation and case conference records.');
    } finally {
      setLoading(false);
    }
  }

  async function saveVisitation() {
    if (!editingVisitation) return;
    setSaving(true);
    try {
      if (editingVisitation.visitationId) {
        await updateExistingVisitation(editingVisitation);
      } else {
        await createHomeVisitation(editingVisitation);
      }
      setShowVisitationModal(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function updateExistingVisitation(visitation: Partial<HomeVisitation>) {
    if (!visitation.visitationId) return;
    await updateHomeVisitation(visitation.visitationId, visitation);
  }

  async function saveConference() {
    if (!editingConference) return;
    setSaving(true);
    try {
      if (editingConference.planId) {
        await updateExistingConference(editingConference);
      } else {
        await createInterventionPlan(editingConference);
      }
      setShowConferenceModal(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function updateExistingConference(conference: Partial<InterventionPlan>) {
    if (!conference.planId) return;
    await updateInterventionPlan(conference.planId, conference);
  }

  const conferences = useMemo(
    () => plans
      .filter((plan) => Boolean(plan.caseConferenceDate || plan.targetDate))
      .sort((a, b) => String(b.caseConferenceDate ?? b.targetDate ?? '').localeCompare(String(a.caseConferenceDate ?? a.targetDate ?? ''))),
    [plans]
  );

  const upcomingConferences = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return conferences.filter((conference) => (conference.caseConferenceDate ?? conference.targetDate ?? '') >= today);
  }, [conferences]);

  const categoryOptions = useMemo(() => {
    if (activeTab === 'visitations') {
      return Array.from(new Set(visitations.map((v) => v.visitType).filter(Boolean) as string[])).sort();
    }
    return Array.from(new Set(conferences.map((c) => c.planCategory).filter(Boolean) as string[])).sort();
  }, [activeTab, visitations, conferences]);
  const statusOptions = useMemo(() => Array.from(new Set(conferences.map((c) => c.status).filter(Boolean) as string[])).sort(), [conferences]);

  const filteredVisitations = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return visitations.filter((v) => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(v.visitType ?? '');
        const searchMatch = !query || [String(v.residentId ?? ''), v.socialWorker, v.visitType, v.familyCooperationLevel]
          .some((value) => String(value ?? '').toLowerCase().includes(query));
        return categoryMatch && searchMatch;
      });
    },
    [visitations, selectedCategories, search]
  );
  const filteredConferences = useMemo(
    () => {
      const query = search.trim().toLowerCase();
      return conferences.filter((c) => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(c.planCategory ?? '');
        const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(c.status ?? '');
        const searchMatch = !query || [String(c.residentId ?? ''), c.planDescription, c.servicesProvided, c.status]
          .some((value) => String(value ?? '').toLowerCase().includes(query));
        return categoryMatch && statusMatch && searchMatch;
      });
    },
    [conferences, selectedCategories, selectedStatuses, search]
  );

  const sortedVisitations = useMemo(() => {
    const dir = visitSortDirection === 'asc' ? 1 : -1;
    return [...filteredVisitations].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (visitSortKey) {
        case 'visitDate':
          av = Date.parse(String(a.visitDate ?? '')) || 0; bv = Date.parse(String(b.visitDate ?? '')) || 0; break;
        case 'residentId':
          av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'socialWorker':
          av = String(a.socialWorker ?? '').toLowerCase(); bv = String(b.socialWorker ?? '').toLowerCase(); break;
        case 'visitType':
          av = String(a.visitType ?? '').toLowerCase(); bv = String(b.visitType ?? '').toLowerCase(); break;
        case 'familyCooperationLevel':
          av = String(a.familyCooperationLevel ?? '').toLowerCase(); bv = String(b.familyCooperationLevel ?? '').toLowerCase(); break;
        case 'safetyConcernsNoted':
          av = a.safetyConcernsNoted ? 1 : 0; bv = b.safetyConcernsNoted ? 1 : 0; break;
        case 'followUpNeeded':
          av = a.followUpNeeded ? 1 : 0; bv = b.followUpNeeded ? 1 : 0; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredVisitations, visitSortDirection, visitSortKey]);

  const sortedConferences = useMemo(() => {
    const dir = conferenceSortDirection === 'asc' ? 1 : -1;
    return [...filteredConferences].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (conferenceSortKey) {
        case 'date':
          av = Date.parse(String(a.caseConferenceDate ?? a.targetDate ?? '')) || 0;
          bv = Date.parse(String(b.caseConferenceDate ?? b.targetDate ?? '')) || 0;
          break;
        case 'residentId':
          av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'planCategory':
          av = String(a.planCategory ?? '').toLowerCase(); bv = String(b.planCategory ?? '').toLowerCase(); break;
        case 'status':
          av = String(a.status ?? '').toLowerCase(); bv = String(b.status ?? '').toLowerCase(); break;
        case 'planDescription':
          av = String(a.planDescription ?? '').toLowerCase(); bv = String(b.planDescription ?? '').toLowerCase(); break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredConferences, conferenceSortDirection, conferenceSortKey]);
  const activeCount = activeTab === 'visitations' ? filteredVisitations.length : filteredConferences.length;
  const totalPages = Math.max(1, Math.ceil(activeCount / pageSize));

  useEffect(() => {
    setSearch('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setActivePage(1);
  }, [activeTab]);

  useEffect(() => {
    setActivePage(1);
  }, [search, selectedCategories, selectedStatuses, pageSize]);

  useEffect(() => {
    if (activePage > totalPages) setActivePage(totalPages);
  }, [activePage, totalPages]);

  const pagedVisitations = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return sortedVisitations.slice(start, start + pageSize);
  }, [sortedVisitations, activePage, pageSize]);
  const pagedConferences = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return sortedConferences.slice(start, start + pageSize);
  }, [sortedConferences, activePage, pageSize]);

  function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function toggleVisitSort(key: typeof visitSortKey) {
    if (visitSortKey === key) {
      setVisitSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setVisitSortKey(key);
    setVisitSortDirection('asc');
  }

  function toggleConferenceSort(key: typeof conferenceSortKey) {
    if (conferenceSortKey === key) {
      setConferenceSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setConferenceSortKey(key);
    setConferenceSortDirection('asc');
  }

  function visitSortIndicator(key: typeof visitSortKey) {
    if (visitSortKey !== key) return '';
    return visitSortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  function conferenceSortIndicator(key: typeof conferenceSortKey) {
    if (conferenceSortKey !== key) return '';
    return conferenceSortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Home Visitation &amp; Case Conferences</h2>
        <div className="mobile-page-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (activeTab === 'visitations') {
                setEditingVisitation({});
                setShowVisitationModal(true);
              } else {
                setEditingConference({ planCategory: 'Case Conference' });
                setShowConferenceModal(true);
              }
            }}
          >
            {activeTab === 'visitations' ? '+ Add Home Visit' : '+ Add Case Conference'}
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === 'visitations' ? 'active' : ''}`} onClick={() => setActiveTab('visitations')}>
            Home Visitations
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${activeTab === 'conferences' ? 'active' : ''}`} onClick={() => setActiveTab('conferences')}>
            Case Conferences
          </button>
        </li>
      </ul>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : activeTab === 'visitations' ? (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Search resident, worker, type..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Visit Type</div>
                {categoryOptions.map((option) => (
                  <div className="form-check" key={option}>
                    <input className="form-check-input" type="checkbox" id={`visit-cat-${option}`} checked={selectedCategories.includes(option)} onChange={() => toggleSelection(setSelectedCategories, option)} />
                    <label className="form-check-label small" htmlFor={`visit-cat-${option}`}>{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-9">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th role="button" onClick={() => toggleVisitSort('visitDate')}>Date{visitSortIndicator('visitDate')}</th>
                <th role="button" onClick={() => toggleVisitSort('residentId')}>Resident{visitSortIndicator('residentId')}</th>
                <th role="button" onClick={() => toggleVisitSort('socialWorker')}>Social Worker{visitSortIndicator('socialWorker')}</th>
                <th role="button" onClick={() => toggleVisitSort('visitType')}>Visit Type{visitSortIndicator('visitType')}</th>
                <th role="button" onClick={() => toggleVisitSort('familyCooperationLevel')}>Family Cooperation{visitSortIndicator('familyCooperationLevel')}</th>
                <th role="button" onClick={() => toggleVisitSort('safetyConcernsNoted')}>Safety{visitSortIndicator('safetyConcernsNoted')}</th>
                <th role="button" onClick={() => toggleVisitSort('followUpNeeded')}>Follow-up{visitSortIndicator('followUpNeeded')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedVisitations.map((v) => (
                <tr key={v.visitationId}>
                  <td>{v.visitDate}</td>
                  <td>{v.residentId}</td>
                  <td>{v.socialWorker}</td>
                  <td>{v.visitType}</td>
                  <td>{v.familyCooperationLevel ?? '—'}</td>
                  <td>{v.safetyConcernsNoted ? 'Concern noted' : 'No concern'}</td>
                  <td>{v.followUpNeeded ? 'Required' : 'Not required'}</td>
                  <td>
                    <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => { setEditingVisitation(v); setShowVisitationModal(true); }}>Edit</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => void deleteHomeVisitation(v.visitationId).then(loadAll)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
              <small className="text-muted">{sortedVisitations.length} visitations total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value="5">5</option><option value="10">10</option><option value="20">20</option>
                </select>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}>Previous</button>
                <span className="small text-muted">Page {activePage} of {totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage >= totalPages} onClick={() => setActivePage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Search resident, status, notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Category</div>
                <div className="mb-3">
                  {categoryOptions.map((option) => (
                    <div className="form-check" key={`conf-cat-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`conf-cat-${option}`} checked={selectedCategories.includes(option)} onChange={() => toggleSelection(setSelectedCategories, option)} />
                      <label className="form-check-label small" htmlFor={`conf-cat-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>
                <div className="small text-muted fw-semibold mb-1">Status</div>
                {statusOptions.map((option) => (
                  <div className="form-check" key={`conf-status-${option}`}>
                    <input className="form-check-input" type="checkbox" id={`conf-status-${option}`} checked={selectedStatuses.includes(option)} onChange={() => toggleSelection(setSelectedStatuses, option)} />
                    <label className="form-check-label small" htmlFor={`conf-status-${option}`}>{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-lg-9">
          <div className="alert border small bg-body-secondary text-dark">
            <span className="fw-semibold">Upcoming conferences:</span>{' '}
            <span className="fw-bold">{upcomingConferences.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th role="button" onClick={() => toggleConferenceSort('date')}>Conference Date{conferenceSortIndicator('date')}</th>
                  <th role="button" onClick={() => toggleConferenceSort('residentId')}>Resident{conferenceSortIndicator('residentId')}</th>
                  <th role="button" onClick={() => toggleConferenceSort('planCategory')}>Type{conferenceSortIndicator('planCategory')}</th>
                  <th role="button" onClick={() => toggleConferenceSort('status')}>Status{conferenceSortIndicator('status')}</th>
                  <th role="button" onClick={() => toggleConferenceSort('planDescription')}>Notes{conferenceSortIndicator('planDescription')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedConferences.map((c) => (
                  <tr key={c.planId}>
                    <td>{c.caseConferenceDate ?? c.targetDate}</td>
                    <td>{c.residentId}</td>
                    <td>{c.planCategory ?? 'Case Conference'}</td>
                    <td>{c.status ?? 'Planned'}</td>
                    <td>{c.planDescription ?? '—'}</td>
                    <td>
                      <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => { setEditingConference(c); setShowConferenceModal(true); }}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => void deleteInterventionPlan(c.planId).then(loadAll)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
            <small className="text-muted">{sortedConferences.length} conferences total</small>
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted mb-0">Per page</label>
              <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value="5">5</option><option value="10">10</option><option value="20">20</option>
              </select>
              <button className="btn btn-outline-secondary btn-sm" disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}>Previous</button>
              <span className="small text-muted">Page {activePage} of {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={activePage >= totalPages} onClick={() => setActivePage((p) => p + 1)}>Next</button>
            </div>
          </div>
          </div>
        </div>
      )}

      {showVisitationModal && editingVisitation ? (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingVisitation.visitationId ? 'Edit Home Visitation' : 'Add Home Visitation'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowVisitationModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label small">Visit Date</label><input type="date" className="form-control form-control-sm" value={String(editingVisitation.visitDate ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, visitDate: e.target.value } : prev)} /></div>
                  <div className="col-md-6"><label className="form-label small">Resident ID</label><input type="number" className="form-control form-control-sm" value={String(editingVisitation.residentId ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} /></div>
                  <div className="col-md-6"><label className="form-label small">Social Worker</label><input type="text" className="form-control form-control-sm" value={String(editingVisitation.socialWorker ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, socialWorker: e.target.value } : prev)} /></div>
                  <div className="col-md-6"><label className="form-label small">Visit Type</label><select className="form-select form-select-sm" value={String(editingVisitation.visitType ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, visitType: e.target.value } : prev)}><option value="">Select type...</option>{VISIT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                  <div className="col-md-6"><label className="form-label small">Family Cooperation Level</label><select className="form-select form-select-sm" value={String(editingVisitation.familyCooperationLevel ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, familyCooperationLevel: e.target.value } : prev)}><option value="">Select level...</option>{COOP_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></div>
                  <div className="col-md-6"><label className="form-label small">Purpose</label><input type="text" className="form-control form-control-sm" value={String(editingVisitation.purpose ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, purpose: e.target.value } : prev)} /></div>
                  <div className="col-12"><label className="form-label small">Home Environment / Observations</label><textarea className="form-control form-control-sm" rows={3} value={String(editingVisitation.observations ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, observations: e.target.value } : prev)} /></div>
                  <div className="col-12"><label className="form-label small">Follow-up Actions</label><textarea className="form-control form-control-sm" rows={2} value={String(editingVisitation.followUpNotes ?? '')} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, followUpNotes: e.target.value } : prev)} /></div>
                  <div className="col-md-6"><div className="form-check mt-2"><input id="safetyConcernsNoted" type="checkbox" className="form-check-input" checked={Boolean(editingVisitation.safetyConcernsNoted)} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, safetyConcernsNoted: e.target.checked } : prev)} /><label className="form-check-label" htmlFor="safetyConcernsNoted">Safety concerns noted</label></div></div>
                  <div className="col-md-6"><div className="form-check mt-2"><input id="followUpNeeded" type="checkbox" className="form-check-input" checked={Boolean(editingVisitation.followUpNeeded)} onChange={(e) => setEditingVisitation((prev) => prev ? { ...prev, followUpNeeded: e.target.checked } : prev)} /><label className="form-check-label" htmlFor="followUpNeeded">Follow-up needed</label></div></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVisitationModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveVisitation()}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showConferenceModal && editingConference ? (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingConference.planId ? 'Edit Case Conference' : 'Add Case Conference'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowConferenceModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><label className="form-label small">Conference Date</label><input type="date" className="form-control form-control-sm" value={String(editingConference.caseConferenceDate ?? '')} onChange={(e) => setEditingConference((prev) => prev ? { ...prev, caseConferenceDate: e.target.value, targetDate: e.target.value } : prev)} /></div>
                  <div className="col-md-6"><label className="form-label small">Resident ID</label><input type="number" className="form-control form-control-sm" value={String(editingConference.residentId ?? '')} onChange={(e) => setEditingConference((prev) => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} /></div>
                  <div className="col-md-6"><label className="form-label small">Status</label><input type="text" className="form-control form-control-sm" value={String(editingConference.status ?? '')} onChange={(e) => setEditingConference((prev) => prev ? { ...prev, status: e.target.value } : prev)} /></div>
                  <div className="col-12"><label className="form-label small">Summary / Observations</label><textarea className="form-control form-control-sm" rows={3} value={String(editingConference.planDescription ?? '')} onChange={(e) => setEditingConference((prev) => prev ? { ...prev, planDescription: e.target.value } : prev)} /></div>
                  <div className="col-12"><label className="form-label small">Follow-up Actions</label><textarea className="form-control form-control-sm" rows={2} value={String(editingConference.servicesProvided ?? '')} onChange={(e) => setEditingConference((prev) => prev ? { ...prev, servicesProvided: e.target.value } : prev)} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConferenceModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveConference()}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

