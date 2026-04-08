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

export default function HomeVisitationCaseConferencePage() {
  const [activeTab, setActiveTab] = useState<Tab>('visitations');
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
      setVisitations(visitationData ?? []);
      setPlans(planData ?? []);
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
      .sort((a, b) => (b.caseConferenceDate ?? b.targetDate ?? '').localeCompare(a.caseConferenceDate ?? a.targetDate ?? '')),
    [plans]
  );

  const upcomingConferences = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return conferences.filter((conference) => (conference.caseConferenceDate ?? conference.targetDate ?? '') >= today);
  }, [conferences]);

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Home Visitation &amp; Case Conferences</h2>
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
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th>Date</th><th>Resident</th><th>Social Worker</th><th>Visit Type</th><th>Family Cooperation</th><th>Safety</th><th>Follow-up</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitations.map((v) => (
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
      ) : (
        <>
          <div className="alert border small bg-body-secondary text-dark">
            <span className="fw-semibold">Upcoming conferences:</span>{' '}
            <span className="fw-bold">{upcomingConferences.length}</span>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Conference Date</th><th>Resident</th><th>Type</th><th>Status</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conferences.map((c) => (
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
        </>
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

