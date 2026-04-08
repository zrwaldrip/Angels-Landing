import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getIncidents,
  getInterventionPlans,
  getHomeVisitations,
  getHealthRecords,
  getEducationRecords,
  createIncident,
  updateIncident,
  deleteIncident,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  createEducationRecord,
  updateEducationRecord,
  deleteEducationRecord,
  createInterventionPlan,
  updateInterventionPlan,
  deleteInterventionPlan,
  createHomeVisitation,
  updateHomeVisitation,
  deleteHomeVisitation,
  type IncidentReport,
  type InterventionPlan,
  type HomeVisitation,
  type HealthRecord,
  type EducationRecord,
} from '../lib/lighthouseAPI';

type Tab = 'incidents' | 'interventions' | 'visits' | 'health' | 'education';

const INCIDENT_TYPE_OPTIONS = ['Physical Abuse', 'Emotional Abuse', 'Neglect', 'Safety Concern', 'HealthIssue', 'Behavioral', 'Other'] as const;
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
const INTERVENTION_STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Cancelled'] as const;
const VISIT_TYPE_OPTIONS = [
  'Initial Assessment',
  'Routine Follow-up',
  'Reintegration Assessment',
  'Post-placement Monitoring',
  'Emergency',
] as const;
const FAMILY_COOPERATION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Limited', 'Resistant'] as const;
const EDUCATION_LEVEL_OPTIONS = ['Elementary', 'Middle School', 'High School', 'College', 'Vocational'] as const;
const ENROLLMENT_STATUS_OPTIONS = ['Enrolled', 'Unenrolled', 'On Leave', 'Graduated'] as const;
const COMPLETION_STATUS_OPTIONS = ['Ongoing', 'Completed', 'Dropped Out'] as const;

function IncidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const [activeTab, setActiveTab] = useState<Tab>('incidents');

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [interventions, setInterventions] = useState<InterventionPlan[]>([]);
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [conferenceResidentFilter, setConferenceResidentFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Partial<IncidentReport> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [editingHealth, setEditingHealth] = useState<Partial<HealthRecord> | null>(null);
  const [savingHealth, setSavingHealth] = useState(false);
  const [saveHealthError, setSaveHealthError] = useState('');

  const [showEduModal, setShowEduModal] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Partial<EducationRecord> | null>(null);
  const [savingEdu, setSavingEdu] = useState(false);
  const [saveEduError, setSaveEduError] = useState('');

  const [showIntervModal, setShowIntervModal] = useState(false);
  const [editingInterv, setEditingInterv] = useState<Partial<InterventionPlan> | null>(null);
  const [savingInterv, setSavingInterv] = useState(false);
  const [saveIntervError, setSaveIntervError] = useState('');

  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Partial<HomeVisitation> | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [saveVisitError, setSaveVisitError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadAll();
  }, [isAuthenticated, isLoading]);

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const [inc, plans, visits, health, edu] = await Promise.all([
        getIncidents(),
        getInterventionPlans(),
        getHomeVisitations(),
        getHealthRecords(),
        getEducationRecords(),
      ]);
      setIncidents(inc);
      setInterventions(plans);
      setVisitations(visits);
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

  // Health Record handlers
  function handleEditHealth(h: HealthRecord) {
    setEditingHealth({ ...h });
    setSaveHealthError('');
    setShowHealthModal(true);
  }

  function handleNewHealth() {
    setEditingHealth({});
    setSaveHealthError('');
    setShowHealthModal(true);
  }

  async function handleSaveHealth() {
    if (!editingHealth) return;
    setSavingHealth(true);
    setSaveHealthError('');
    try {
      if (editingHealth.healthRecordId) {
        await updateHealthRecord(editingHealth.healthRecordId, editingHealth);
      } else {
        await createHealthRecord(editingHealth);
      }
      setShowHealthModal(false);
      const updated = await getHealthRecords();
      setHealthRecords(updated);
    } catch (e) {
      setSaveHealthError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingHealth(false);
    }
  }

  async function handleDeleteHealth(id: number) {
    if (!confirm('Delete this health record?')) return;
    try {
      await deleteHealthRecord(id);
      setHealthRecords(prev => prev.filter(h => h.healthRecordId !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  // Education Record handlers
  function handleEditEdu(e: EducationRecord) {
    setEditingEdu({ ...e });
    setSaveEduError('');
    setShowEduModal(true);
  }

  function handleNewEdu() {
    setEditingEdu({});
    setSaveEduError('');
    setShowEduModal(true);
  }

  async function handleSaveEdu() {
    if (!editingEdu) return;
    setSavingEdu(true);
    setSaveEduError('');
    try {
      if (editingEdu.educationRecordId) {
        await updateEducationRecord(editingEdu.educationRecordId, editingEdu);
      } else {
        await createEducationRecord(editingEdu);
      }
      setShowEduModal(false);
      const updated = await getEducationRecords();
      setEducationRecords(updated);
    } catch (e) {
      setSaveEduError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingEdu(false);
    }
  }

  async function handleDeleteEdu(id: number) {
    if (!confirm('Delete this education record?')) return;
    try {
      await deleteEducationRecord(id);
      setEducationRecords(prev => prev.filter(e => e.educationRecordId !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  // Intervention Plan handlers
  function handleEditInterv(p: InterventionPlan) {
    setEditingInterv({ ...p });
    setSaveIntervError('');
    setShowIntervModal(true);
  }

  function handleNewInterv() {
    setEditingInterv({});
    setSaveIntervError('');
    setShowIntervModal(true);
  }

  async function handleSaveInterv() {
    if (!editingInterv) return;
    setSavingInterv(true);
    setSaveIntervError('');
    try {
      if (editingInterv.planId) {
        await updateInterventionPlan(editingInterv.planId, editingInterv);
      } else {
        await createInterventionPlan(editingInterv);
      }
      setShowIntervModal(false);
      const updated = await getInterventionPlans();
      setInterventions(updated);
    } catch (e) {
      setSaveIntervError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingInterv(false);
    }
  }

  async function handleDeleteInterv(id: number) {
    if (!confirm('Delete this intervention plan?')) return;
    try {
      await deleteInterventionPlan(id);
      setInterventions(prev => prev.filter(p => p.planId !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  function handleEditVisit(v: HomeVisitation) {
    setEditingVisit({ ...v });
    setSaveVisitError('');
    setShowVisitModal(true);
  }

  function handleNewVisit() {
    setEditingVisit({
      socialWorker: authSession.email ?? '',
      locationVisited: 'Home',
      followUpNeeded: true,
    });
    setSaveVisitError('');
    setShowVisitModal(true);
  }

  async function handleSaveVisit() {
    if (!editingVisit) return;
    setSavingVisit(true);
    setSaveVisitError('');
    try {
      if (editingVisit.visitationId) {
        await updateHomeVisitation(editingVisit.visitationId, editingVisit);
      } else {
        await createHomeVisitation(editingVisit);
      }
      setShowVisitModal(false);
      const updated = await getHomeVisitations();
      setVisitations(updated);
    } catch (e) {
      setSaveVisitError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSavingVisit(false);
    }
  }

  async function handleDeleteVisit(id: number) {
    if (!confirm('Delete this home/field visit?')) return;
    try {
      await deleteHomeVisitation(id);
      setVisitations(prev => prev.filter(v => v.visitationId !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  function parseComparableDate(value?: string): number | null {
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function formatDateLabel(value?: string): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }

  const selectedResidentId = conferenceResidentFilter.trim()
    ? Number(conferenceResidentFilter.trim())
    : undefined;

  const conferenceItems = interventions
    .filter((plan) => {
      if (!Number.isFinite(selectedResidentId as number) && selectedResidentId !== undefined) return false;
      if (selectedResidentId === undefined) return true;
      return plan.residentId === selectedResidentId;
    })
    .map((plan) => {
      const conferenceDate = plan.caseConferenceDate ?? plan.targetDate;
      return {
        ...plan,
        conferenceDate,
        comparableDate: parseComparableDate(conferenceDate),
      };
    })
    .filter((plan) => plan.conferenceDate)
    .sort((a, b) => {
      if (a.comparableDate == null && b.comparableDate == null) return 0;
      if (a.comparableDate == null) return 1;
      if (b.comparableDate == null) return -1;
      return a.comparableDate - b.comparableDate;
    });

  const now = Date.now();
  const upcomingConferences = conferenceItems.filter((plan) => plan.comparableDate != null && plan.comparableDate >= now);
  const conferenceHistory = conferenceItems.filter((plan) => plan.comparableDate != null && plan.comparableDate < now).reverse();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'incidents', label: 'Incident Reports' },
    { key: 'interventions', label: 'Intervention Plans' },
    { key: 'visits', label: 'Home & Field Visits' },
    { key: 'health', label: 'Health Records' },
    { key: 'education', label: 'Education Records' },
  ];

  function getAddButtonConfig(): { label: string; onClick: () => void } {
    switch (activeTab) {
      case 'incidents':
        return {
          label: '+ Add Incident',
          onClick: () => {
            setEditingIncident({});
            setSaveError('');
            setShowModal(true);
          }
        };
      case 'interventions':
        return {
          label: '+ Add Intervention',
          onClick: handleNewInterv
        };
      case 'visits':
        return {
          label: '+ Log Visit',
          onClick: handleNewVisit
        };
      case 'health':
        return {
          label: '+ Add Health Record',
          onClick: handleNewHealth
        };
      case 'education':
      default:
        return {
          label: '+ Add Education Record',
          onClick: handleNewEdu
        };
    }
  }

  const addButton = getAddButtonConfig();

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Case Records</h2>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={addButton.onClick}>
            {addButton.label}
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
        <>
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-end gap-3 mb-3">
                <div>
                  <label className="form-label small mb-1">Resident ID Filter (Conference View)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="All residents"
                    value={conferenceResidentFilter}
                    onChange={(e) => setConferenceResidentFilter(e.target.value)}
                  />
                </div>
                <div className="small text-muted pb-1">
                  Shows case conference history and upcoming conferences for each resident.
                </div>
              </div>

              <div className="row g-3">
                <div className="col-lg-6">
                  <h6 className="mb-2">Upcoming Conferences</h6>
                  {upcomingConferences.length === 0 ? (
                    <div className="small text-muted">No upcoming conferences found.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {upcomingConferences.map((plan) => (
                        <li key={`upcoming-${plan.planId}`} className="list-group-item px-0 py-2">
                          <div className="fw-semibold">Resident #{plan.residentId ?? 'N/A'} - {plan.planCategory ?? 'Conference'}</div>
                          <div className="small text-muted">
                            {formatDateLabel(plan.conferenceDate)} | Status: {plan.status ?? 'Planned'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="col-lg-6">
                  <h6 className="mb-2">Conference History</h6>
                  {conferenceHistory.length === 0 ? (
                    <div className="small text-muted">No conference history found.</div>
                  ) : (
                    <ul className="list-group list-group-flush">
                      {conferenceHistory.map((plan) => (
                        <li key={`history-${plan.planId}`} className="list-group-item px-0 py-2">
                          <div className="fw-semibold">Resident #{plan.residentId ?? 'N/A'} - {plan.planCategory ?? 'Conference'}</div>
                          <div className="small text-muted">
                            {formatDateLabel(plan.conferenceDate)} | Status: {plan.status ?? 'Completed'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th>ID</th><th>Resident</th><th>Category</th><th>Status</th><th>Conference Date</th><th>Target Date</th><th>Services Provided</th>{isAdmin && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {interventions.map((p) => (
                  <tr key={p.planId}>
                    <td>{p.planId}</td><td>{p.residentId}</td><td>{p.planCategory}</td>
                    <td><span className={`badge ${p.status === 'Completed' ? 'text-bg-success' : p.status === 'In Progress' ? 'text-bg-primary' : 'text-bg-secondary'}`}>{p.status}</span></td>
                    <td>{formatDateLabel(p.caseConferenceDate)}</td>
                    <td>{p.targetDate}</td><td>{p.servicesProvided}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditInterv(p)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteInterv(p.planId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'visits' ? (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>ID</th><th>Resident</th><th>Date</th><th>Visit Type</th><th>Location</th>
                  <th>Home Environment Observations</th><th>Family Cooperation</th><th>Safety Concerns</th><th>Follow-up Actions</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visitations.map((v) => (
                  <tr key={v.visitationId}>
                    <td>{v.visitationId}</td>
                    <td>{v.residentId}</td>
                    <td>{formatDateLabel(v.visitDate)}</td>
                    <td>{v.visitType}</td>
                    <td>{v.locationVisited}</td>
                    <td>{v.observations}</td>
                    <td>{v.familyCooperationLevel}</td>
                    <td>{v.safetyConcernsNoted ? 'Yes' : 'No'}</td>
                    <td>{v.followUpNotes}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditVisit(v)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteVisit(v.visitationId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === 'health' ? (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th>ID</th><th>Resident</th><th>Date</th><th>Health</th><th>Nutrition</th><th>Sleep</th><th>Energy</th><th>BMI</th><th>Medical</th><th>Dental</th><th>Psych</th>{isAdmin && <th>Actions</th>}</tr>
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
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditHealth(h)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteHealth(h.healthRecordId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th>ID</th><th>Resident</th><th>Date</th><th>Level</th><th>School</th><th>Enrollment</th><th>Attendance</th><th>Progress</th><th>Completion</th>{isAdmin && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {educationRecords.map((e) => (
                  <tr key={e.educationRecordId}>
                    <td>{e.educationRecordId}</td><td>{e.residentId}</td><td>{e.recordDate}</td>
                    <td>{e.educationLevel}</td><td>{e.schoolName}</td><td>{e.enrollmentStatus}</td>
                    <td>{e.attendanceRate?.toFixed(1)}%</td>
                    <td>{e.progressPercent?.toFixed(1)}%</td>
                    <td>{e.completionStatus}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditEdu(e)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteEdu(e.educationRecordId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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

      {/* Health Record Modal */}
      {showHealthModal && editingHealth && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingHealth.healthRecordId ? 'Edit Health Record' : 'Add Health Record'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowHealthModal(false)} />
              </div>
              <div className="modal-body">
                {saveHealthError ? <div className="alert alert-danger">{saveHealthError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident ID</label>
                    <input type="number" className="form-control form-control-sm"
                      value={String(editingHealth.residentId ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Record Date</label>
                    <input type="date" className="form-control form-control-sm"
                      value={String(editingHealth.recordDate ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, recordDate: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">General Health Score</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.generalHealthScore ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, generalHealthScore: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Nutrition Score</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.nutritionScore ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, nutritionScore: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Sleep Quality Score</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.sleepQualityScore ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, sleepQualityScore: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Energy Level Score</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.energyLevelScore ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, energyLevelScore: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Height (cm)</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.heightCm ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, heightCm: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Weight (kg)</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingHealth.weightKg ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, weightKg: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input id="medicalCheck" type="checkbox" className="form-check-input"
                        checked={Boolean(editingHealth.medicalCheckupDone)}
                        onChange={(e) => setEditingHealth(prev => prev ? { ...prev, medicalCheckupDone: e.target.checked } : prev)} />
                      <label className="form-check-label small" htmlFor="medicalCheck">Medical Checkup Done</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input id="dentalCheck" type="checkbox" className="form-check-input"
                        checked={Boolean(editingHealth.dentalCheckupDone)}
                        onChange={(e) => setEditingHealth(prev => prev ? { ...prev, dentalCheckupDone: e.target.checked } : prev)} />
                      <label className="form-check-label small" htmlFor="dentalCheck">Dental Checkup Done</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input id="psychCheck" type="checkbox" className="form-check-input"
                        checked={Boolean(editingHealth.psychologicalCheckupDone)}
                        onChange={(e) => setEditingHealth(prev => prev ? { ...prev, psychologicalCheckupDone: e.target.checked } : prev)} />
                      <label className="form-check-label small" htmlFor="psychCheck">Psychological Checkup Done</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Notes</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingHealth.notes ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, notes: e.target.value } : prev)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHealthModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveHealth} disabled={savingHealth}>
                  {savingHealth ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Education Record Modal */}
      {showEduModal && editingEdu && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingEdu.educationRecordId ? 'Edit Education Record' : 'Add Education Record'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowEduModal(false)} />
              </div>
              <div className="modal-body">
                {saveEduError ? <div className="alert alert-danger">{saveEduError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident ID</label>
                    <input type="number" className="form-control form-control-sm"
                      value={String(editingEdu.residentId ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Record Date</label>
                    <input type="date" className="form-control form-control-sm"
                      value={String(editingEdu.recordDate ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, recordDate: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Education Level</label>
                    <select className="form-select form-select-sm"
                      value={String(editingEdu.educationLevel ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, educationLevel: e.target.value } : prev)}>
                      <option value="">Select level...</option>
                      {EDUCATION_LEVEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">School Name</label>
                    <input type="text" className="form-control form-control-sm"
                      value={String(editingEdu.schoolName ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, schoolName: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Enrollment Status</label>
                    <select className="form-select form-select-sm"
                      value={String(editingEdu.enrollmentStatus ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, enrollmentStatus: e.target.value } : prev)}>
                      <option value="">Select status...</option>
                      {ENROLLMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Attendance Rate %</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingEdu.attendanceRate ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, attendanceRate: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Progress %</label>
                    <input type="number" step="0.1" className="form-control form-control-sm"
                      value={String(editingEdu.progressPercent ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, progressPercent: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Completion Status</label>
                    <select className="form-select form-select-sm"
                      value={String(editingEdu.completionStatus ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, completionStatus: e.target.value } : prev)}>
                      <option value="">Select status...</option>
                      {COMPLETION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Notes</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingEdu.notes ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, notes: e.target.value } : prev)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEduModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveEdu} disabled={savingEdu}>
                  {savingEdu ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Plan Modal */}
      {showIntervModal && editingInterv && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingInterv.planId ? 'Edit Intervention Plan' : 'Add Intervention Plan'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowIntervModal(false)} />
              </div>
              <div className="modal-body">
                {saveIntervError ? <div className="alert alert-danger">{saveIntervError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident ID</label>
                    <input type="number" className="form-control form-control-sm"
                      value={String(editingInterv.residentId ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Status</label>
                    <select className="form-select form-select-sm"
                      value={String(editingInterv.status ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, status: e.target.value } : prev)}>
                      <option value="">Select status...</option>
                      {INTERVENTION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Plan Category</label>
                    <input type="text" className="form-control form-control-sm"
                      value={String(editingInterv.planCategory ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, planCategory: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Target Date</label>
                    <input type="date" className="form-control form-control-sm"
                      value={String(editingInterv.targetDate ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, targetDate: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Case Conference Date</label>
                    <input type="date" className="form-control form-control-sm"
                      value={String(editingInterv.caseConferenceDate ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, caseConferenceDate: e.target.value } : prev)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Plan Description</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingInterv.planDescription ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, planDescription: e.target.value } : prev)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Services Provided</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingInterv.servicesProvided ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, servicesProvided: e.target.value } : prev)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIntervModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveInterv} disabled={savingInterv}>
                  {savingInterv ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home/Field Visit Modal */}
      {showVisitModal && editingVisit && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingVisit.visitationId ? 'Edit Visit Log' : 'Log Home/Field Visit'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowVisitModal(false)} />
              </div>
              <div className="modal-body">
                {saveVisitError ? <div className="alert alert-danger">{saveVisitError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small">Resident ID</label>
                    <input type="number" className="form-control form-control-sm"
                      value={String(editingVisit.residentId ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Visit Date</label>
                    <input type="date" className="form-control form-control-sm"
                      value={String(editingVisit.visitDate ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, visitDate: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Staff / Social Worker</label>
                    <input type="text" className="form-control form-control-sm"
                      value={String(editingVisit.socialWorker ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, socialWorker: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Visit Type</label>
                    <select className="form-select form-select-sm"
                      value={String(editingVisit.visitType ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, visitType: e.target.value } : prev)}>
                      <option value="">Select visit type...</option>
                      {VISIT_TYPE_OPTIONS.map((visitType) => <option key={visitType} value={visitType}>{visitType}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Location</label>
                    <select className="form-select form-select-sm"
                      value={String(editingVisit.locationVisited ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, locationVisited: e.target.value } : prev)}>
                      <option value="">Select location...</option>
                      <option value="Home">Home</option>
                      <option value="Field">Field</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Home Environment Observations</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingVisit.observations ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, observations: e.target.value } : prev)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Family Cooperation Level</label>
                    <select className="form-select form-select-sm"
                      value={String(editingVisit.familyCooperationLevel ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, familyCooperationLevel: e.target.value } : prev)}>
                      <option value="">Select cooperation level...</option>
                      {FAMILY_COOPERATION_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Purpose / Context</label>
                    <input type="text" className="form-control form-control-sm"
                      value={String(editingVisit.purpose ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, purpose: e.target.value } : prev)} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Follow-up Actions</label>
                    <textarea className="form-control form-control-sm" rows={2}
                      value={String(editingVisit.followUpNotes ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, followUpNotes: e.target.value } : prev)} />
                  </div>
                  <div className="col-12">
                    <div className="form-check mb-2">
                      <input id="visitSafetyConcerns" type="checkbox" className="form-check-input"
                        checked={Boolean(editingVisit.safetyConcernsNoted)}
                        onChange={(e) => setEditingVisit(prev => prev ? { ...prev, safetyConcernsNoted: e.target.checked } : prev)} />
                      <label className="form-check-label small" htmlFor="visitSafetyConcerns">Safety concerns identified</label>
                    </div>
                    <div className="form-check">
                      <input id="visitFollowupNeeded" type="checkbox" className="form-check-input"
                        checked={Boolean(editingVisit.followUpNeeded)}
                        onChange={(e) => setEditingVisit(prev => prev ? { ...prev, followUpNeeded: e.target.checked } : prev)} />
                      <label className="form-check-label small" htmlFor="visitFollowupNeeded">Follow-up needed</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVisitModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveVisit} disabled={savingVisit}>
                  {savingVisit ? 'Saving...' : 'Save'}
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
