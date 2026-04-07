import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-warning">Please <Link to="/login">sign in</Link> to view this page.</div>
      </div>
    );
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
                  {[
                    ['residentId', 'Resident ID'], ['safehouseId', 'Safehouse ID'],
                    ['incidentDate', 'Date'], ['incidentType', 'Type'],
                    ['severity', 'Severity'], ['reportedBy', 'Reported By'],
                    ['description', 'Description'], ['responseTaken', 'Response Taken'],
                  ].map(([field, label]) => (
                    <div className="col-md-6" key={field}>
                      <label className="form-label small">{label}</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        value={String(editingIncident[field as keyof IncidentReport] ?? '')}
                        onChange={(e) => setEditingIncident(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
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

export default IncidentsPage;
