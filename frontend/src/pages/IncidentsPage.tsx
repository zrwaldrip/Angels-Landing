import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getIncidents,
  getInterventionPlans,
  getHomeVisitations,
  getHealthRecords,
  getEducationRecords,
  getResidents,
  getSafehouses,
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
  type Resident,
  type Safehouse,
} from '../lib/lighthouseAPI';

type Tab = 'incidents' | 'interventions' | 'visits' | 'health' | 'education';
type IncidentSortKey =
  | 'incidentId'
  | 'residentId'
  | 'safehouseId'
  | 'incidentDate'
  | 'incidentType'
  | 'severity'
  | 'resolved'
  | 'reportedBy';
type InterventionSortKey = 'planId' | 'residentId' | 'planCategory' | 'status' | 'targetDate' | 'caseConferenceDate' | 'servicesProvided';
type VisitSortKey = 'visitationId' | 'residentId' | 'visitDate' | 'visitType' | 'locationVisited' | 'familyCooperationLevel' | 'safetyConcernsNoted' | 'followUpNotes';
type HealthSortKey = 'healthRecordId' | 'residentId' | 'recordDate' | 'generalHealthScore' | 'nutritionScore' | 'sleepQualityScore' | 'energyLevelScore' | 'bmi';
type EducationSortKey = 'educationRecordId' | 'residentId' | 'recordDate' | 'educationLevel' | 'schoolName' | 'enrollmentStatus' | 'attendanceRate' | 'progressPercent' | 'completionStatus';

const INCIDENT_TYPE_OPTIONS = ['Behavioral', 'Medical', 'Security', 'RunawayAttempt', 'SelfHarm', 'ConflictWithPeer', 'PropertyDamage'] as const;
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High'] as const;
const INTERVENTION_STATUS_OPTIONS = ['Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'] as const;
const VISIT_TYPE_OPTIONS = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
] as const;
const FAMILY_COOPERATION_OPTIONS = ['Highly Cooperative', 'Cooperative', 'Neutral', 'Uncooperative'] as const;
const EDUCATION_LEVEL_OPTIONS = ['Primary', 'Secondary', 'Vocational', 'CollegePrep'] as const;
const ATTENDANCE_STATUS_OPTIONS = ['Present', 'Late', 'Absent'] as const;
const COMPLETION_STATUS_OPTIONS = ['NotStarted', 'InProgress', 'Completed'] as const;
const PLAN_CATEGORIES = ['Safety', 'Psychosocial', 'Education', 'Physical Health', 'Legal', 'Reintegration'] as const;

function IncidentsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const [activeTab, setActiveTab] = useState<Tab>('incidents');
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [incidentResidentSearch, setIncidentResidentSearch] = useState('');
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState<string[]>([]);
  const [selectedIncidentSeverities, setSelectedIncidentSeverities] = useState<string[]>([]);
  const [visitSearch, setVisitSearch] = useState('');
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);
  const [healthSearch, setHealthSearch] = useState('');
  const [selectedHealthFlags, setSelectedHealthFlags] = useState<string[]>([]);
  const [educationSearch, setEducationSearch] = useState('');
  const [selectedEducationLevels, setSelectedEducationLevels] = useState<string[]>([]);
  const [selectedEducationCompletionStatuses, setSelectedEducationCompletionStatuses] = useState<string[]>([]);
  const [interventionResidentSearch, setInterventionResidentSearch] = useState('');
  const [selectedInterventionCategories, setSelectedInterventionCategories] = useState<string[]>([]);
  const [selectedInterventionStatuses, setSelectedInterventionStatuses] = useState<string[]>([]);
  const [selectedInterventionDateBuckets, setSelectedInterventionDateBuckets] = useState<string[]>([]);
  const [selectedInterventionServiceFlags, setSelectedInterventionServiceFlags] = useState<string[]>([]);
  const [incidentSortKey, setIncidentSortKey] = useState<IncidentSortKey>('incidentDate');
  const [incidentSortDirection, setIncidentSortDirection] = useState<'asc' | 'desc'>('desc');
  const [interventionSortKey, setInterventionSortKey] = useState<InterventionSortKey>('targetDate');
  const [interventionSortDirection, setInterventionSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visitSortKey, setVisitSortKey] = useState<VisitSortKey>('visitDate');
  const [visitSortDirection, setVisitSortDirection] = useState<'asc' | 'desc'>('desc');
  const [healthSortKey, setHealthSortKey] = useState<HealthSortKey>('recordDate');
  const [healthSortDirection, setHealthSortDirection] = useState<'asc' | 'desc'>('desc');
  const [educationSortKey, setEducationSortKey] = useState<EducationSortKey>('recordDate');
  const [educationSortDirection, setEducationSortDirection] = useState<'asc' | 'desc'>('desc');

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [interventions, setInterventions] = useState<InterventionPlan[]>([]);
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);

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
      const [inc, plans, visits, health, edu, resResult, shList] = await Promise.all([
        getIncidents(),
        getInterventionPlans(),
        getHomeVisitations(),
        getHealthRecords(),
        getEducationRecords(),
        getResidents({ page: 1, pageSize: 1000 }),
        getSafehouses(),
      ]);
      setIncidents(inc);
      setInterventions(plans);
      setVisitations(visits);
      setHealthRecords(health);
      setEducationRecords(edu);
      setResidents(resResult.items);
      setSafehouses(shList);
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

function formatEnumLabel(value?: string): string {
  if (!value) return '—';
  const normalized = value.trim();
  if (/^in\s*prog(?:r|re)ess$/i.test(normalized)) return 'In Progress';
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const incidentTypeOptions = useMemo(() => Array.from(new Set(incidents.map((i) => i.incidentType).filter(Boolean) as string[])).sort(), [incidents]);
  const visitTypeOptions = useMemo(() => Array.from(new Set(visitations.map((v) => v.visitType).filter(Boolean) as string[])).sort(), [visitations]);
  const educationLevelFilterOptions = useMemo(() => Array.from(new Set(educationRecords.map((e) => e.educationLevel).filter(Boolean) as string[])).sort(), [educationRecords]);
  const educationCompletionFilterOptions = useMemo(
    () =>
      Array.from(new Set(educationRecords.map((e) => e.completionStatus).filter(Boolean) as string[]))
        .sort((a, b) => formatEnumLabel(a).localeCompare(formatEnumLabel(b))),
    [educationRecords]
  );
  const interventionCategoryOptions = useMemo(
    () => Array.from(new Set(interventions.map((p) => p.planCategory).filter(Boolean) as string[])).sort(),
    [interventions]
  );
  const interventionStatusOptions = useMemo(
    () => Array.from(new Set(interventions.map((p) => p.status).filter(Boolean) as string[])).sort(),
    [interventions]
  );

  function toggleMultiSelect(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const filteredIncidents = useMemo(
    () => {
      const residentSearch = incidentResidentSearch.trim().toLowerCase();
      return incidents.filter((i) => {
        const typeMatch = selectedIncidentTypes.length === 0 || selectedIncidentTypes.includes(i.incidentType ?? '');
        const severityMatch = selectedIncidentSeverities.length === 0 || selectedIncidentSeverities.includes(i.severity ?? '');
        if (!typeMatch || !severityMatch) return false;
        if (!residentSearch) return true;
        return String(i.residentId ?? '').toLowerCase().includes(residentSearch);
      });
    },
    [incidents, incidentResidentSearch, selectedIncidentTypes, selectedIncidentSeverities]
  );
  const filteredInterventions = useMemo(
    () => {
      const residentSearch = interventionResidentSearch.trim().toLowerCase();
      const now = Date.now();
      return interventions.filter((p) => {
        const categoryMatch = selectedInterventionCategories.length === 0 || selectedInterventionCategories.includes(p.planCategory ?? '');
        const statusMatch = selectedInterventionStatuses.length === 0 || selectedInterventionStatuses.includes(p.status ?? '');
        const residentMatch = !residentSearch || String(p.residentId ?? '').toLowerCase().includes(residentSearch);
        const comparableDate = parseComparableDate(p.caseConferenceDate ?? p.targetDate);
        const dateBucket =
          comparableDate == null ? 'undated'
            : comparableDate >= now ? 'upcoming'
              : 'past';
        const dateMatch = selectedInterventionDateBuckets.length === 0 || selectedInterventionDateBuckets.includes(dateBucket);
        const hasServices = Boolean((p.servicesProvided ?? '').trim());
        const servicesBucket = hasServices ? 'withServices' : 'withoutServices';
        const serviceMatch = selectedInterventionServiceFlags.length === 0 || selectedInterventionServiceFlags.includes(servicesBucket);
        return categoryMatch && statusMatch && residentMatch && dateMatch && serviceMatch;
      });
    },
    [
      interventions,
      interventionResidentSearch,
      selectedInterventionCategories,
      selectedInterventionStatuses,
      selectedInterventionDateBuckets,
      selectedInterventionServiceFlags,
    ]
  );
  const filteredVisitations = useMemo(
    () => {
      const normalizedSearch = visitSearch.trim().toLowerCase();
      return visitations.filter((v) => {
        const typeMatch = selectedVisitTypes.length === 0 || selectedVisitTypes.includes(v.visitType ?? '');
        if (!typeMatch) return false;
        if (!normalizedSearch) return true;
        return [String(v.residentId ?? ''), v.socialWorker, v.locationVisited, v.familyCooperationLevel]
          .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
      });
    },
    [visitations, selectedVisitTypes, visitSearch]
  );
  const filteredHealthRecords = useMemo(
    () => {
      const normalizedSearch = healthSearch.trim().toLowerCase();
      return healthRecords.filter((h) => {
        const searchMatch = !normalizedSearch || String(h.residentId ?? '').toLowerCase().includes(normalizedSearch);
        const medicalFlag = h.medicalCheckupDone ? 'Medical Checkup Done' : 'Medical Checkup Pending';
        const flagMatch = selectedHealthFlags.length === 0 || selectedHealthFlags.includes(medicalFlag);
        return searchMatch && flagMatch;
      });
    },
    [healthRecords, healthSearch, selectedHealthFlags]
  );
  const filteredEducationRecords = useMemo(
    () => {
      const normalizedSearch = educationSearch.trim().toLowerCase();
      return educationRecords.filter((e) => {
        const levelMatch = selectedEducationLevels.length === 0 || selectedEducationLevels.includes(e.educationLevel ?? '');
        const completionMatch = selectedEducationCompletionStatuses.length === 0 || selectedEducationCompletionStatuses.includes(e.completionStatus ?? '');
        if (!levelMatch || !completionMatch) return false;
        if (!normalizedSearch) return true;
        return [String(e.residentId ?? ''), e.schoolName, e.enrollmentStatus]
          .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
      });
    },
    [educationRecords, educationSearch, selectedEducationLevels, selectedEducationCompletionStatuses]
  );

  const activeItemCount = useMemo(() => {
    switch (activeTab) {
      case 'incidents': return filteredIncidents.length;
      case 'interventions': return filteredInterventions.length;
      case 'visits': return filteredVisitations.length;
      case 'health': return filteredHealthRecords.length;
      case 'education': return filteredEducationRecords.length;
      default: return 0;
    }
  }, [activeTab, filteredIncidents.length, filteredInterventions.length, filteredVisitations.length, filteredHealthRecords.length, filteredEducationRecords.length]);
  const totalPages = Math.max(1, Math.ceil(activeItemCount / pageSize));

  useEffect(() => {
    setActivePage(1);
    setIncidentResidentSearch('');
    setSelectedIncidentTypes([]);
    setSelectedIncidentSeverities([]);
    setInterventionResidentSearch('');
    setSelectedInterventionCategories([]);
    setSelectedInterventionStatuses([]);
    setSelectedInterventionDateBuckets([]);
    setSelectedInterventionServiceFlags([]);
    setVisitSearch('');
    setSelectedVisitTypes([]);
    setHealthSearch('');
    setSelectedHealthFlags([]);
    setEducationSearch('');
    setSelectedEducationLevels([]);
    setSelectedEducationCompletionStatuses([]);
  }, [activeTab]);

  useEffect(() => {
    setActivePage(1);
  }, [
    incidentResidentSearch,
    selectedIncidentTypes,
    selectedIncidentSeverities,
    interventionResidentSearch,
    selectedInterventionCategories,
    selectedInterventionStatuses,
    selectedInterventionDateBuckets,
    selectedInterventionServiceFlags,
    visitSearch,
    selectedVisitTypes,
    healthSearch,
    selectedHealthFlags,
    educationSearch,
    selectedEducationLevels,
    selectedEducationCompletionStatuses,
  ]);

  useEffect(() => {
    if (activePage > totalPages) setActivePage(totalPages);
  }, [activePage, totalPages]);

  function paginate<T>(items: T[]) {
    const start = (activePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  const sortedIncidents = useMemo(() => {
    const severityRank: Record<string, number> = {
      Low: 1,
      Medium: 2,
      High: 3,
      Critical: 4,
    };
    const dir = incidentSortDirection === 'asc' ? 1 : -1;
    return [...filteredIncidents].sort((a, b) => {
      let av: number | string = '';
      let bv: number | string = '';
      switch (incidentSortKey) {
        case 'incidentId':
          av = a.incidentId ?? 0;
          bv = b.incidentId ?? 0;
          break;
        case 'residentId':
          av = a.residentId ?? 0;
          bv = b.residentId ?? 0;
          break;
        case 'safehouseId':
          av = a.safehouseId ?? 0;
          bv = b.safehouseId ?? 0;
          break;
        case 'incidentDate':
          av = parseComparableDate(a.incidentDate) ?? 0;
          bv = parseComparableDate(b.incidentDate) ?? 0;
          break;
        case 'incidentType':
          av = (a.incidentType ?? '').toLowerCase();
          bv = (b.incidentType ?? '').toLowerCase();
          break;
        case 'severity':
          av = severityRank[a.severity ?? ''] ?? 0;
          bv = severityRank[b.severity ?? ''] ?? 0;
          break;
        case 'resolved':
          av = a.resolved ? 1 : 0;
          bv = b.resolved ? 1 : 0;
          break;
        case 'reportedBy':
          av = (a.reportedBy ?? '').toLowerCase();
          bv = (b.reportedBy ?? '').toLowerCase();
          break;
        default:
          av = 0;
          bv = 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredIncidents, incidentSortKey, incidentSortDirection]);
  const sortedInterventions = useMemo(() => {
    const dir = interventionSortDirection === 'asc' ? 1 : -1;
    return [...filteredInterventions].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (interventionSortKey) {
        case 'planId': av = a.planId ?? 0; bv = b.planId ?? 0; break;
        case 'residentId': av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'planCategory': av = String(a.planCategory ?? '').toLowerCase(); bv = String(b.planCategory ?? '').toLowerCase(); break;
        case 'status': av = String(a.status ?? '').toLowerCase(); bv = String(b.status ?? '').toLowerCase(); break;
        case 'targetDate': av = parseComparableDate(a.targetDate) ?? 0; bv = parseComparableDate(b.targetDate) ?? 0; break;
        case 'caseConferenceDate': av = parseComparableDate(a.caseConferenceDate) ?? 0; bv = parseComparableDate(b.caseConferenceDate) ?? 0; break;
        case 'servicesProvided': av = String(a.servicesProvided ?? '').toLowerCase(); bv = String(b.servicesProvided ?? '').toLowerCase(); break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredInterventions, interventionSortDirection, interventionSortKey]);
  const sortedVisitations = useMemo(() => {
    const dir = visitSortDirection === 'asc' ? 1 : -1;
    return [...filteredVisitations].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (visitSortKey) {
        case 'visitationId': av = a.visitationId ?? 0; bv = b.visitationId ?? 0; break;
        case 'residentId': av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'visitDate': av = parseComparableDate(a.visitDate) ?? 0; bv = parseComparableDate(b.visitDate) ?? 0; break;
        case 'visitType': av = String(a.visitType ?? '').toLowerCase(); bv = String(b.visitType ?? '').toLowerCase(); break;
        case 'locationVisited': av = String(a.locationVisited ?? '').toLowerCase(); bv = String(b.locationVisited ?? '').toLowerCase(); break;
        case 'familyCooperationLevel': av = String(a.familyCooperationLevel ?? '').toLowerCase(); bv = String(b.familyCooperationLevel ?? '').toLowerCase(); break;
        case 'safetyConcernsNoted': av = a.safetyConcernsNoted ? 1 : 0; bv = b.safetyConcernsNoted ? 1 : 0; break;
        case 'followUpNotes': av = String(a.followUpNotes ?? '').toLowerCase(); bv = String(b.followUpNotes ?? '').toLowerCase(); break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredVisitations, visitSortDirection, visitSortKey]);
  const sortedHealthRecords = useMemo(() => {
    const dir = healthSortDirection === 'asc' ? 1 : -1;
    return [...filteredHealthRecords].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (healthSortKey) {
        case 'healthRecordId': av = a.healthRecordId ?? 0; bv = b.healthRecordId ?? 0; break;
        case 'residentId': av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'recordDate': av = parseComparableDate(a.recordDate) ?? 0; bv = parseComparableDate(b.recordDate) ?? 0; break;
        case 'generalHealthScore': av = a.generalHealthScore ?? 0; bv = b.generalHealthScore ?? 0; break;
        case 'nutritionScore': av = a.nutritionScore ?? 0; bv = b.nutritionScore ?? 0; break;
        case 'sleepQualityScore': av = a.sleepQualityScore ?? 0; bv = b.sleepQualityScore ?? 0; break;
        case 'energyLevelScore': av = a.energyLevelScore ?? 0; bv = b.energyLevelScore ?? 0; break;
        case 'bmi': av = a.bmi ?? 0; bv = b.bmi ?? 0; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredHealthRecords, healthSortDirection, healthSortKey]);
  const sortedEducationRecords = useMemo(() => {
    const dir = educationSortDirection === 'asc' ? 1 : -1;
    return [...filteredEducationRecords].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (educationSortKey) {
        case 'educationRecordId': av = a.educationRecordId ?? 0; bv = b.educationRecordId ?? 0; break;
        case 'residentId': av = a.residentId ?? 0; bv = b.residentId ?? 0; break;
        case 'recordDate': av = parseComparableDate(a.recordDate) ?? 0; bv = parseComparableDate(b.recordDate) ?? 0; break;
        case 'educationLevel': av = String(a.educationLevel ?? '').toLowerCase(); bv = String(b.educationLevel ?? '').toLowerCase(); break;
        case 'schoolName': av = String(a.schoolName ?? '').toLowerCase(); bv = String(b.schoolName ?? '').toLowerCase(); break;
        case 'enrollmentStatus': av = String(a.enrollmentStatus ?? '').toLowerCase(); bv = String(b.enrollmentStatus ?? '').toLowerCase(); break;
        case 'attendanceRate': av = a.attendanceRate ?? 0; bv = b.attendanceRate ?? 0; break;
        case 'progressPercent': av = a.progressPercent ?? 0; bv = b.progressPercent ?? 0; break;
        case 'completionStatus': av = String(a.completionStatus ?? '').toLowerCase(); bv = String(b.completionStatus ?? '').toLowerCase(); break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredEducationRecords, educationSortDirection, educationSortKey]);

  function toggleIncidentSort(key: IncidentSortKey) {
    if (incidentSortKey === key) {
      setIncidentSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setIncidentSortKey(key);
    setIncidentSortDirection('asc');
  }

  function incidentSortIndicator(key: IncidentSortKey) {
    if (incidentSortKey !== key) return '';
    return incidentSortDirection === 'asc' ? ' ▲' : ' ▼';
  }
  function toggleInterventionSort(key: InterventionSortKey) {
    if (interventionSortKey === key) {
      setInterventionSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setInterventionSortKey(key);
    setInterventionSortDirection('asc');
  }
  function interventionSortIndicator(key: InterventionSortKey) {
    if (interventionSortKey !== key) return '';
    return interventionSortDirection === 'asc' ? ' ▲' : ' ▼';
  }
  function toggleVisitSort(key: VisitSortKey) {
    if (visitSortKey === key) {
      setVisitSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setVisitSortKey(key);
    setVisitSortDirection('asc');
  }
  function visitSortIndicator(key: VisitSortKey) {
    if (visitSortKey !== key) return '';
    return visitSortDirection === 'asc' ? ' ▲' : ' ▼';
  }
  function toggleHealthSort(key: HealthSortKey) {
    if (healthSortKey === key) {
      setHealthSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setHealthSortKey(key);
    setHealthSortDirection('asc');
  }
  function healthSortIndicator(key: HealthSortKey) {
    if (healthSortKey !== key) return '';
    return healthSortDirection === 'asc' ? ' ▲' : ' ▼';
  }
  function toggleEducationSort(key: EducationSortKey) {
    if (educationSortKey === key) {
      setEducationSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setEducationSortKey(key);
    setEducationSortDirection('asc');
  }
  function educationSortIndicator(key: EducationSortKey) {
    if (educationSortKey !== key) return '';
    return educationSortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  const pagedIncidents = useMemo(() => paginate(sortedIncidents), [sortedIncidents, activePage]);
  const pagedInterventions = useMemo(() => paginate(sortedInterventions), [sortedInterventions, activePage]);
  const pagedVisitations = useMemo(() => paginate(sortedVisitations), [sortedVisitations, activePage]);
  const pagedHealthRecords = useMemo(() => paginate(sortedHealthRecords), [sortedHealthRecords, activePage]);
  const pagedEducationRecords = useMemo(() => paginate(sortedEducationRecords), [sortedEducationRecords, activePage]);

  return (
    <div className="container mt-4 incidents-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Case Records</h2>
        {isAdmin && (
          <div className="mobile-page-actions">
            <button className="btn btn-primary btn-sm" onClick={addButton.onClick}>
              {addButton.label}
            </button>
          </div>
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
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Resident</label>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Search by Resident ID" value={incidentResidentSearch} onChange={(e) => setIncidentResidentSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Incident Type</div>
                <div className="mb-3">
                  {incidentTypeOptions.map((option) => (
                    <div className="form-check" key={`incident-type-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`incident-type-${option}`} checked={selectedIncidentTypes.includes(option)} onChange={() => toggleMultiSelect(setSelectedIncidentTypes, option)} />
                      <label className="form-check-label small" htmlFor={`incident-type-${option}`}>{formatEnumLabel(option)}</label>
                    </div>
                  ))}
                </div>
                <div className="small text-muted fw-semibold mb-1">Severity</div>
                <div className="mb-3">
                  {SEVERITY_OPTIONS.map((option) => (
                    <div className="form-check" key={`incident-severity-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`incident-severity-${option}`} checked={selectedIncidentSeverities.includes(option)} onChange={() => toggleMultiSelect(setSelectedIncidentSeverities, option)} />
                      <label className="form-check-label small" htmlFor={`incident-severity-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setIncidentResidentSearch(''); setSelectedIncidentTypes([]); setSelectedIncidentSeverities([]); }}>Clear All Filters</button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th role="button" onClick={() => toggleIncidentSort('incidentId')}>ID{incidentSortIndicator('incidentId')}</th>
                <th role="button" onClick={() => toggleIncidentSort('residentId')}>Resident{incidentSortIndicator('residentId')}</th>
                <th role="button" onClick={() => toggleIncidentSort('safehouseId')}>Safehouse{incidentSortIndicator('safehouseId')}</th>
                <th role="button" onClick={() => toggleIncidentSort('incidentDate')}>Date{incidentSortIndicator('incidentDate')}</th>
                <th role="button" onClick={() => toggleIncidentSort('incidentType')}>Type{incidentSortIndicator('incidentType')}</th>
                <th role="button" onClick={() => toggleIncidentSort('severity')}>Severity{incidentSortIndicator('severity')}</th>
                <th role="button" onClick={() => toggleIncidentSort('resolved')}>Resolved{incidentSortIndicator('resolved')}</th>
                <th role="button" onClick={() => toggleIncidentSort('reportedBy')}>Reported By{incidentSortIndicator('reportedBy')}</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pagedIncidents.map((i) => (
                <tr key={i.incidentId}>
                  <td>{i.incidentId}</td><td>{i.residentId}</td><td>{i.safehouseId}</td>
                  <td>{i.incidentDate}</td><td>{formatEnumLabel(i.incidentType)}</td>
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
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-0 flex-wrap">
              <small className="text-muted">{sortedIncidents.length} incidents total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setActivePage(1); }}>
                  <option value="5">5</option><option value="10">10</option><option value="20">20</option>
                </select>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}>Previous</button>
                <span className="small text-muted">Page {activePage} of {totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage >= totalPages} onClick={() => setActivePage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'interventions' ? (
          <div className="row g-3">
            <div className="col-lg-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h6 className="mb-3">Filters</h6>
                  <label className="form-label small mb-1">Resident</label>
                  <input
                    type="text"
                    className="form-control form-control-sm mb-3"
                    placeholder="Search by Resident ID"
                    value={interventionResidentSearch}
                    onChange={(e) => setInterventionResidentSearch(e.target.value)}
                  />

                  <div className="small text-muted fw-semibold mb-1">Category</div>
                  <div className="mb-3">
                    {interventionCategoryOptions.length === 0 ? (
                      <div className="small text-muted">No categories available.</div>
                    ) : interventionCategoryOptions.map((category) => (
                      <div className="form-check" key={`category-${category}`}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`intervention-category-${category}`}
                          checked={selectedInterventionCategories.includes(category)}
                          onChange={() => toggleMultiSelect(setSelectedInterventionCategories, category)}
                        />
                        <label className="form-check-label small" htmlFor={`intervention-category-${category}`}>
                          {formatEnumLabel(category)}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="small text-muted fw-semibold mb-1">Status</div>
                  <div className="mb-3">
                    {interventionStatusOptions.length === 0 ? (
                      <div className="small text-muted">No statuses available.</div>
                    ) : interventionStatusOptions.map((status) => (
                      <div className="form-check" key={`status-${status}`}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`intervention-status-${status}`}
                          checked={selectedInterventionStatuses.includes(status)}
                          onChange={() => toggleMultiSelect(setSelectedInterventionStatuses, status)}
                        />
                        <label className="form-check-label small" htmlFor={`intervention-status-${status}`}>
                          {formatEnumLabel(status)}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="small text-muted fw-semibold mb-1">Conference Timing</div>
                  <div className="mb-3">
                    {[
                      { key: 'upcoming', label: 'Upcoming' },
                      { key: 'past', label: 'Past' },
                      { key: 'undated', label: 'Undated' },
                    ].map((option) => (
                      <div className="form-check" key={option.key}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`intervention-date-${option.key}`}
                          checked={selectedInterventionDateBuckets.includes(option.key)}
                          onChange={() => toggleMultiSelect(setSelectedInterventionDateBuckets, option.key)}
                        />
                        <label className="form-check-label small" htmlFor={`intervention-date-${option.key}`}>
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="small text-muted fw-semibold mb-1">Services</div>
                  <div className="mb-3">
                    {[
                      { key: 'withServices', label: 'Has services' },
                      { key: 'withoutServices', label: 'No services listed' },
                    ].map((option) => (
                      <div className="form-check" key={option.key}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`intervention-services-${option.key}`}
                          checked={selectedInterventionServiceFlags.includes(option.key)}
                          onChange={() => toggleMultiSelect(setSelectedInterventionServiceFlags, option.key)}
                        />
                        <label className="form-check-label small" htmlFor={`intervention-services-${option.key}`}>
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setInterventionResidentSearch('');
                      setSelectedInterventionCategories([]);
                      setSelectedInterventionStatuses([]);
                      setSelectedInterventionDateBuckets([]);
                      setSelectedInterventionServiceFlags([]);
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
            <div className="col-lg-9">
              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <div className="small text-muted">Filtered Plans</div>
                      <div className="h5 mb-0">{filteredInterventions.length}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <div className="small text-muted">Upcoming Conferences</div>
                      <div className="h5 mb-0">
                        {filteredInterventions.filter((plan) => {
                          const conferenceDate = parseComparableDate(plan.caseConferenceDate ?? plan.targetDate);
                          return conferenceDate != null && conferenceDate >= Date.now();
                        }).length}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <div className="small text-muted">Past Conferences</div>
                      <div className="h5 mb-0">
                        {filteredInterventions.filter((plan) => {
                          const conferenceDate = parseComparableDate(plan.caseConferenceDate ?? plan.targetDate);
                          return conferenceDate != null && conferenceDate < Date.now();
                        }).length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-responsive shadow-sm rounded">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th role="button" onClick={() => toggleInterventionSort('planId')}>ID{interventionSortIndicator('planId')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('residentId')}>Resident{interventionSortIndicator('residentId')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('planCategory')}>Category{interventionSortIndicator('planCategory')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('status')}>Status{interventionSortIndicator('status')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('targetDate')}>Target Date{interventionSortIndicator('targetDate')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('caseConferenceDate')}>Conference Date{interventionSortIndicator('caseConferenceDate')}</th>
                      <th role="button" onClick={() => toggleInterventionSort('servicesProvided')}>Services Provided{interventionSortIndicator('servicesProvided')}</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedInterventions.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="text-center text-muted py-3">
                          No intervention plans match the current filters.
                        </td>
                      </tr>
                    ) : pagedInterventions.map((p) => (
                      <tr key={p.planId}>
                        <td>{p.planId}</td><td>{p.residentId}</td><td>{formatEnumLabel(p.planCategory)}</td>
                        <td><span className={`badge ${p.status === 'Completed' ? 'text-bg-success' : p.status === 'In Progress' || p.status === 'InProgress' ? 'text-bg-primary' : 'text-bg-secondary'}`}>{formatEnumLabel(p.status)}</span></td>
                        <td>{formatDateLabel(p.targetDate)}</td>
                        <td>{formatDateLabel(p.caseConferenceDate)}</td>
                        <td>{p.servicesProvided || '—'}</td>
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
              <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
                <small className="text-muted">{sortedInterventions.length} intervention plans total</small>
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-muted mb-0">Per page</label>
                  <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setActivePage(1); }}>
                    <option value="5">5</option><option value="10">10</option><option value="20">20</option>
                  </select>
                  <button className="btn btn-outline-secondary btn-sm" disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}>Previous</button>
                  <span className="small text-muted">Page {activePage} of {totalPages}</span>
                  <button className="btn btn-outline-secondary btn-sm" disabled={activePage >= totalPages} onClick={() => setActivePage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </div>
      ) : activeTab === 'visits' ? (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Search</label>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Resident, worker, location..." value={visitSearch} onChange={(e) => setVisitSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Visit Type</div>
                <div className="mb-3">
                  {visitTypeOptions.map((option) => (
                    <div className="form-check" key={`visit-type-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`visit-type-${option}`} checked={selectedVisitTypes.includes(option)} onChange={() => toggleMultiSelect(setSelectedVisitTypes, option)} />
                      <label className="form-check-label small" htmlFor={`visit-type-${option}`}>{formatEnumLabel(option)}</label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setVisitSearch(''); setSelectedVisitTypes([]); }}>Clear All Filters</button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th role="button" onClick={() => toggleVisitSort('visitationId')}>ID{visitSortIndicator('visitationId')}</th>
                  <th role="button" onClick={() => toggleVisitSort('residentId')}>Resident{visitSortIndicator('residentId')}</th>
                  <th role="button" onClick={() => toggleVisitSort('visitDate')}>Date{visitSortIndicator('visitDate')}</th>
                  <th role="button" onClick={() => toggleVisitSort('visitType')}>Visit Type{visitSortIndicator('visitType')}</th>
                  <th role="button" onClick={() => toggleVisitSort('locationVisited')}>Location{visitSortIndicator('locationVisited')}</th>
                  <th>Home Environment Observations</th><th role="button" onClick={() => toggleVisitSort('familyCooperationLevel')}>Family Cooperation{visitSortIndicator('familyCooperationLevel')}</th><th role="button" onClick={() => toggleVisitSort('safetyConcernsNoted')}>Safety Concerns{visitSortIndicator('safetyConcernsNoted')}</th><th role="button" onClick={() => toggleVisitSort('followUpNotes')}>Follow-up Actions{visitSortIndicator('followUpNotes')}</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pagedVisitations.map((v) => (
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
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
              <small className="text-muted">{sortedVisitations.length} visit records total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setActivePage(1); }}>
                  <option value="5">5</option><option value="10">10</option><option value="20">20</option>
                </select>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage <= 1} onClick={() => setActivePage((p) => p - 1)}>Previous</button>
                <span className="small text-muted">Page {activePage} of {totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={activePage >= totalPages} onClick={() => setActivePage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'health' ? (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Resident</label>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Search by Resident ID" value={healthSearch} onChange={(e) => setHealthSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Medical Checkup</div>
                <div className="mb-3">
                  {['Medical Checkup Done', 'Medical Checkup Pending'].map((option) => (
                    <div className="form-check" key={`health-flag-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`health-flag-${option}`} checked={selectedHealthFlags.includes(option)} onChange={() => toggleMultiSelect(setSelectedHealthFlags, option)} />
                      <label className="form-check-label small" htmlFor={`health-flag-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setHealthSearch(''); setSelectedHealthFlags([]); }}>Clear All Filters</button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th role="button" onClick={() => toggleHealthSort('healthRecordId')}>ID{healthSortIndicator('healthRecordId')}</th><th role="button" onClick={() => toggleHealthSort('residentId')}>Resident{healthSortIndicator('residentId')}</th><th role="button" onClick={() => toggleHealthSort('recordDate')}>Date{healthSortIndicator('recordDate')}</th><th role="button" onClick={() => toggleHealthSort('generalHealthScore')}>Health{healthSortIndicator('generalHealthScore')}</th><th role="button" onClick={() => toggleHealthSort('nutritionScore')}>Nutrition{healthSortIndicator('nutritionScore')}</th><th role="button" onClick={() => toggleHealthSort('sleepQualityScore')}>Sleep{healthSortIndicator('sleepQualityScore')}</th><th role="button" onClick={() => toggleHealthSort('energyLevelScore')}>Energy{healthSortIndicator('energyLevelScore')}</th><th role="button" onClick={() => toggleHealthSort('bmi')}>BMI{healthSortIndicator('bmi')}</th><th>Medical</th><th>Dental</th><th>Psych</th>{isAdmin && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {pagedHealthRecords.map((h) => (
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
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
              <small className="text-muted">{sortedHealthRecords.length} health records total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setActivePage(1); }}>
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
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Search</label>
                <input type="text" className="form-control form-control-sm mb-3" placeholder="Resident, school, enrollment..." value={educationSearch} onChange={(e) => setEducationSearch(e.target.value)} />
                <div className="small text-muted fw-semibold mb-1">Education Level</div>
                <div className="mb-3">
                  {educationLevelFilterOptions.map((option) => (
                    <div className="form-check" key={`education-level-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`education-level-${option}`} checked={selectedEducationLevels.includes(option)} onChange={() => toggleMultiSelect(setSelectedEducationLevels, option)} />
                      <label className="form-check-label small" htmlFor={`education-level-${option}`}>{formatEnumLabel(option)}</label>
                    </div>
                  ))}
                </div>
                <div className="small text-muted fw-semibold mb-1">Completion</div>
                <div className="mb-3">
                  {educationCompletionFilterOptions.map((option) => (
                    <div className="form-check" key={`education-completion-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`education-completion-${option}`} checked={selectedEducationCompletionStatuses.includes(option)} onChange={() => toggleMultiSelect(setSelectedEducationCompletionStatuses, option)} />
                      <label className="form-check-label small" htmlFor={`education-completion-${option}`}>{formatEnumLabel(option)}</label>
                    </div>
                  ))}
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setEducationSearch(''); setSelectedEducationLevels([]); setSelectedEducationCompletionStatuses([]); }}>Clear All Filters</button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr><th role="button" onClick={() => toggleEducationSort('educationRecordId')}>ID{educationSortIndicator('educationRecordId')}</th><th role="button" onClick={() => toggleEducationSort('residentId')}>Resident{educationSortIndicator('residentId')}</th><th role="button" onClick={() => toggleEducationSort('recordDate')}>Date{educationSortIndicator('recordDate')}</th><th role="button" onClick={() => toggleEducationSort('educationLevel')}>Level{educationSortIndicator('educationLevel')}</th><th role="button" onClick={() => toggleEducationSort('schoolName')}>School{educationSortIndicator('schoolName')}</th><th role="button" onClick={() => toggleEducationSort('enrollmentStatus')}>Enrollment{educationSortIndicator('enrollmentStatus')}</th><th role="button" onClick={() => toggleEducationSort('attendanceRate')}>Attendance{educationSortIndicator('attendanceRate')}</th><th role="button" onClick={() => toggleEducationSort('progressPercent')}>Progress{educationSortIndicator('progressPercent')}</th><th role="button" onClick={() => toggleEducationSort('completionStatus')}>Completion{educationSortIndicator('completionStatus')}</th>{isAdmin && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {pagedEducationRecords.map((e) => (
                  <tr key={e.educationRecordId}>
                    <td>{e.educationRecordId}</td><td>{e.residentId}</td><td>{e.recordDate}</td>
                    <td>{e.educationLevel}</td><td>{e.schoolName}</td><td>{e.enrollmentStatus}</td>
                    <td>{e.attendanceRate?.toFixed(1)}%</td>
                    <td>{e.progressPercent?.toFixed(1)}%</td>
                    <td>{formatEnumLabel(e.completionStatus)}</td>
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
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
              <small className="text-muted">{sortedEducationRecords.length} education records total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setActivePage(1); }}>
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
                    <label className="form-label small">Resident</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingIncident.residentId ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}
                    >
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.residentId} — {r.internalCode ?? r.caseControlNo ?? ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Safehouse</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingIncident.safehouseId ?? '')}
                      onChange={(e) => setEditingIncident(prev => prev ? { ...prev, safehouseId: Number(e.target.value) || undefined } : prev)}
                    >
                      <option value="">Select safehouse...</option>
                      {safehouses.map((s) => (
                        <option key={s.safehouseId} value={s.safehouseId}>
                          {s.safehouseId} — {s.name ?? s.safehouseCode ?? ''}
                        </option>
                      ))}
                    </select>
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
                      {INCIDENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
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
                    <label className="form-label small">Resident</label>
                    <select className="form-select form-select-sm"
                      value={String(editingHealth.residentId ?? '')}
                      onChange={(e) => setEditingHealth(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}>
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.residentId} — {r.internalCode ?? r.caseControlNo ?? ''}
                        </option>
                      ))}
                    </select>
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
                    <label className="form-label small">Resident</label>
                    <select className="form-select form-select-sm"
                      value={String(editingEdu.residentId ?? '')}
                      onChange={(e) => setEditingEdu(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}>
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.residentId} — {r.internalCode ?? r.caseControlNo ?? ''}
                        </option>
                      ))}
                    </select>
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
                      {ATTENDANCE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
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
                    <label className="form-label small">Resident</label>
                    <select className="form-select form-select-sm"
                      value={String(editingInterv.residentId ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}>
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.residentId} — {r.internalCode ?? r.caseControlNo ?? ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Status</label>
                    <select className="form-select form-select-sm"
                      value={String(editingInterv.status ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, status: e.target.value } : prev)}>
                      <option value="">Select status...</option>
                      {INTERVENTION_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatEnumLabel(s)}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Plan Category</label>
                    <select className="form-select form-select-sm"
                      value={String(editingInterv.planCategory ?? '')}
                      onChange={(e) => setEditingInterv(prev => prev ? { ...prev, planCategory: e.target.value } : prev)}>
                      <option value="">Select category...</option>
                      {PLAN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
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
                    <label className="form-label small">Resident</label>
                    <select className="form-select form-select-sm"
                      value={String(editingVisit.residentId ?? '')}
                      onChange={(e) => setEditingVisit(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}>
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.residentId} — {r.internalCode ?? r.caseControlNo ?? ''}
                        </option>
                      ))}
                    </select>
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
