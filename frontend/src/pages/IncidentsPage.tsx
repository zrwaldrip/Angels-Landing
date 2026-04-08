import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getIncidents,
  getInterventionPlans,
  getHealthRecords,
  getEducationRecords,
  createIncident,
  updateIncident,
  deleteIncident,
  type IncidentReport,
  type InterventionPlan,
  type HealthRecord,
  type EducationRecord,
} from '../lib/lighthouseAPI';

type Tab = 'incidents' | 'interventions' | 'health' | 'education';

const INCIDENT_TYPE_OPTIONS = ['Physical Abuse', 'Emotional Abuse', 'Neglect', 'Safety Concern', 'HealthIssue', 'Behavioral', 'Other'] as const;
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
const INTERVENTION_STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const;
const EDUCATION_LEVEL_OPTIONS = ['Elementary', 'Middle School', 'High School', 'College', 'Vocational'] as const;
const ENROLLMENT_STATUS_OPTIONS = ['Enrolled', 'Unenrolled', 'On Leave', 'Graduated'] as const;
const COMPLETION_STATUS_OPTIONS = ['Ongoing', 'Completed', 'Dropped Out'] as const;

function IncidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const [activeTab, setActiveTab] = useState<Tab>('incidents');

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [interventions, setInterventions] = useState<InterventionPlan[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Partial<IncidentReport> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadAll();
  }, [isAuthenticated, isLoading]);

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const [inc, plans, health, edu] = await Promise.all([
        getIncidents(),
        getInterventionPlans(),
        getHealthRecords(),
        getEducationRecords(),
      ]);
      setIncidents(inc);
      setInterventions(plans);
      setHealthRecords(health);
      setEducationRecords(edu);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingIncident) return;
    setSaving(true); setSaveError('');
    try {
      if (editingIncident.incidentId) {
        await updateIncident(editingIncident.incidentId, editingIncident);
      } else {
        await createIncident(editingIncident);
      }
      setShowModal(false);
      const updated = await getIncidents();
      setIncidents(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this incident report?')) return;
    try {
      await deleteIncident(id);
      setIncidents(prev => prev.filter(i => i.incidentId !== id));
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete.'); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'incidents', label: 'Incident Reports' },
    { key: 'interventions', label: 'Intervention Plans' },
    { key: 'health', label: 'Health Records' },
    { key: 'education', label: 'Education Records' },
  ];

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Case Records</h2>
        {isAdmin && activeTab === 'incidents' && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingIncident({}); setSaveError(''); setShowModal(true); }}>
            + Add Incident
          </button>
        )}
      </div>

      <ul className="nav nav-tabs mb-3">
        {tabs.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : activeTab === 'incidents' ? (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th>ID</th><th>Resident</th><th>Safehouse</th><th>Date</th>
                <th>Type</th><th>Severity</th><th>Resolved</th><th>Reported By</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.incidentId}>
                  <td>{i.incidentId}</td><td>{i.residentId}</td><td>{i.safehouseId}</td>
                  <td>{i.incidentDate}</td><td>{i.incidentType}</td>
                  <td>
                    <span className={`badge ${i.severity === 'Critical' ? 'text-bg-danger' : i.severity === 'High' ? 'text-bg-warning' : i.severity === 'Medium' ? 'text-bg-info' : 'text-bg-secondary'}`}>
                      {i.severity}
                    </span>
                  </td>
                  <td>{i.resolved ? '✓' : '—'}</td>
                  <td>{i.reportedBy}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => { setEditingIncident({ ...i }); setSaveError(''); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(i.incidentId)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'interventions' ? (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr><th>ID</th><th>Resident</th><th>Category</th><th>Status</th><th>Target Date</th><th>Services Provided</th></tr>
            </thead>
            <tbody>
              {interventions.map((p) => (
                <tr key={p.planId}>
                  <td>{p.planId}</td><td>{p.residentId}</td><td>{p.planCategory}</td>
                  <td><span className={`badge ${p.status === 'Completed' ? 'text-bg-success' : p.status === 'In Progress' ? 'text-bg-primary' : 'text-bg-secondary'}`}>{p.status}</span></td>
                  <td>{p.targetDate}</td><td>{p.servicesProvided}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'health' ? (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr><th>ID</th><th>Resident</th><th>Date</th><th>Health</th><th>Nutrition</th><th>Sleep</th><th>Energy</th><th>BMI</th><th>Medical</th><th>Dental</th><th>Psych</th></tr>
            </thead>
            <tbody>
              {healthRecords.map((h) => (
                <tr key={h.healthRecordId}>
                  <td>{h.healthRecordId}</td><td>{h.residentId}</td><td>{h.recordDate}</td>
                  <td>{h.generalHealthScore?.toFixed(1)}</td>
                  <td>{h.nutritionScore?.toFixed(1)}</td>
                  <td>{h.sleepQualityScore?.toFixed(1)}</td>
                  <td>{h.energyLevelScore?.toFixed(1)}</td>
                  <td>{h.bmi?.toFixed(1)}</td>
                  <td>{h.medicalCheckupDone ? '✓' : '—'}</td>
                  <td>{h.dentalCheckupDone ? '✓' : '—'}</td>
                  <td>{h.psychologicalCheckupDone ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr><th>ID</th><th>Resident</th><th>Date</th><th>Level</th><th>School</th><th>Enrollment</th><th>Attendance</th><th>Progress</th><th>Completion</th></tr>
            </thead>
            <tbody>
              {educationRecords.map((e) => (
                <tr key={e.educationRecordId}>
                  <td>{e.educationRecordId}</td><td>{e.residentId}</td><td>{e.recordDate}</td>
                  <td>{e.educationLevel}</td><td>{e.schoolName}</td><td>{e.enrollmentStatus}</td>
                  <td>{e.attendanceRate?.toFixed(1)}%</td>
                  <td>{e.progressPercent?.toFixed(1)}%</td>
                  <td>{e.completionStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Incident Modal */}
      {showModal && editingIncident && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingIncident.incidentId ? 'Edit Incident' : 'Add Incident'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident ID</label>
                    <input
                      type="number" className="form-control form-control-sm"
                      value={String(editingIncident.residentId ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Safehouse ID</label>
                    <input
                      type="number" className="form-control form-control-sm"
                      value={String(editingIncident.safehouseId ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, safehouseId: Number(e.target.value) || undefined } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Date</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingIncident.incidentDate ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, incidentDate: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingIncident.incidentType ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, incidentType: e.target.value } : prev)}
                    >
                      <option value="">Select incident type...</option>
                      {INCIDENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Severity</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingIncident.severity ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, severity: e.target.value } : prev)}
                    >
                      <option value="">Select severity...</option>
                      {SEVERITY_OPTIONS.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Reported By</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingIncident.reportedBy ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, reportedBy: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Description</label>
                    <textarea
                      className="form-control form-control-sm" rows={2}
                      value={String(editingIncident.description ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, description: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Response Taken</label>
                    <textarea
                      className="form-control form-control-sm" rows={2}
                      value={String(editingIncident.responseTaken ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, responseTaken: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Resolution Date</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      value={String(editingIncident.resolutionDate ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, resolutionDate: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <div className="form-check mt-4">
                      <input
                        id="resolved"
                        type="checkbox" className="form-check-input"
                        checked={Boolean(editingIncident.resolved)}
                        onChange={(e) => setEditingIncident(prev => prev ? { ...prev, resolved: e.target.checked } : prev)}
                      />
                      <label className="form-check-label small" htmlFor="resolved">Resolved</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input
                        id="followUp"
                        type="checkbox" className="form-check-input"
                        checked={Boolean(editingIncident.followUpRequired)}
                        onChange={(e) => setEditingIncident(prev => prev ? { ...prev, followUpRequired: e.target.checked } : prev)}
                      />
                      <label className="form-check-label small" htmlFor="followUp">Follow-up Required</label>
                    </div>
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

export default IncidentsPage;
