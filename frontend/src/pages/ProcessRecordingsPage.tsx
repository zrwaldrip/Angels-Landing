import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  createProcessRecording,
  deleteProcessRecording,
  getProcessRecordings,
  getResidents,
  updateProcessRecording,
  type ProcessRecording,
  type Resident,
} from '../lib/lighthouseAPI';

const SESSION_TYPE_OPTIONS = ['Individual', 'Group'] as const;
const EMOTIONAL_STATE_OPTIONS = ['Anxious', 'Calm', 'Guarded', 'Hopeful', 'Sad', 'Angry', 'Withdrawn', 'Overwhelmed', 'Euthymic', 'Other'] as const;

function toDateInputValue(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function safeDateSortValue(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function ProcessRecordingsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [searchParams, setSearchParams] = useSearchParams();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentSearch, setResidentSearch] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecordings, setTotalRecordings] = useState(0);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingRecording, setEditingRecording] = useState<Partial<ProcessRecording> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadResidents();
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!residents.length) return;
    const residentIdParam = searchParams.get('residentId');
    const pageParam = searchParams.get('page');

    if (pageParam) {
      const parsedPage = Number(pageParam);
      if (Number.isFinite(parsedPage) && parsedPage > 0) {
        setCurrentPage(parsedPage);
      }
    }

    if (residentIdParam) {
      const parsed = Number(residentIdParam);
      if (Number.isFinite(parsed)) {
        setSelectedResidentId(parsed);
        return;
      }
    }
    if (selectedResidentId == null) {
      const firstResident = residents[0];
      if (firstResident) setSelectedResidentId(firstResident.residentId);
    }
  }, [residents, searchParams, selectedResidentId]);

  useEffect(() => {
    if (selectedResidentId == null) {
      setRecordings([]);
      setTotalRecordings(0);
      return;
    }
    void loadRecordings(selectedResidentId, currentPage);
    setSearchParams({ residentId: String(selectedResidentId), page: String(currentPage) }, { replace: true });
  }, [selectedResidentId, currentPage, setSearchParams]);

  async function loadResidents() {
    setLoadingResidents(true);
    setError('');
    try {
      const result = await getResidents({ page: 1, pageSize: 1000 });
      setResidents(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load residents.');
    } finally {
      setLoadingResidents(false);
    }
  }

  async function loadRecordings(residentId: number, page: number) {
    setLoadingRecordings(true);
    setError('');
    try {
      const data = await getProcessRecordings({ residentId, page, pageSize });
      setRecordings(data.items);
      setTotalRecordings(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load process recordings.');
    } finally {
      setLoadingRecordings(false);
    }
  }

  const residentOptions = useMemo(() => {
    const search = residentSearch.trim().toLowerCase();
    const filtered = residents.filter((resident) => {
      if (!search) return true;
      const code = String(resident.internalCode ?? '').toLowerCase();
      const worker = String(resident.assignedSocialWorker ?? '').toLowerCase();
      const residentId = String(resident.residentId);
      return code.includes(search) || worker.includes(search) || residentId.includes(search);
    });
    const selectedResident = residents.find((resident) => resident.residentId === selectedResidentId);
    if (selectedResident && !filtered.some((resident) => resident.residentId === selectedResident.residentId)) {
      return [selectedResident, ...filtered];
    }
    return filtered;
  }, [residentSearch, residents, selectedResidentId]);

  const selectedResident = residents.find((resident) => resident.residentId === selectedResidentId) ?? null;
  const totalPages = Math.max(1, Math.ceil(totalRecordings / pageSize));

  const sortedRecordings = useMemo(() => {
    return [...recordings].sort((a, b) => safeDateSortValue(a.sessionDate) - safeDateSortValue(b.sessionDate));
  }, [recordings]);

  function changeResident(residentId: number | null) {
    setSelectedResidentId(residentId);
    setCurrentPage(1);
  }

  function handleNew() {
    setEditingRecording({
      residentId: selectedResidentId ?? undefined,
      sessionDate: new Date().toISOString().slice(0, 10),
      sessionType: 'Individual',
      progressNoted: false,
      concernsFlagged: false,
      referralMade: false,
    });
    setSaveError('');
    setShowModal(true);
  }

  function handleEdit(recording: ProcessRecording) {
    setEditingRecording({ ...recording });
    setSaveError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingRecording) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload: Partial<ProcessRecording> = {
        ...editingRecording,
        residentId: editingRecording.residentId != null ? Number(editingRecording.residentId) : undefined,
        sessionDurationMinutes: editingRecording.sessionDurationMinutes != null ? Number(editingRecording.sessionDurationMinutes) : undefined,
        sessionDate: editingRecording.sessionDate ? toDateInputValue(editingRecording.sessionDate) : undefined,
        sessionType: editingRecording.sessionType ? String(editingRecording.sessionType).trim() : undefined,
        socialWorker: editingRecording.socialWorker ? String(editingRecording.socialWorker).trim() : undefined,
        emotionalStateObserved: editingRecording.emotionalStateObserved ? String(editingRecording.emotionalStateObserved).trim() : undefined,
        emotionalStateEnd: editingRecording.emotionalStateEnd ? String(editingRecording.emotionalStateEnd).trim() : undefined,
        sessionNarrative: editingRecording.sessionNarrative ? String(editingRecording.sessionNarrative).trim() : undefined,
        interventionsApplied: editingRecording.interventionsApplied ? String(editingRecording.interventionsApplied).trim() : undefined,
        followUpActions: editingRecording.followUpActions ? String(editingRecording.followUpActions).trim() : undefined,
        notesRestricted: editingRecording.notesRestricted ? String(editingRecording.notesRestricted).trim() : undefined,
      };

      if (editingRecording.recordingId) {
        await updateProcessRecording(editingRecording.recordingId, payload);
      } else {
        await createProcessRecording(payload);
      }

      setShowModal(false);
      if (selectedResidentId != null) {
        await loadRecordings(selectedResidentId, currentPage);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save process recording.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this process recording?')) return;
    try {
      await deleteProcessRecording(id);
      if (selectedResidentId != null) {
        const nextTotal = Math.max(0, totalRecordings - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
        const nextPage = Math.min(currentPage, nextTotalPages);
        setCurrentPage(nextPage);
        await loadRecordings(selectedResidentId, nextPage);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  return (
    <div className="container mt-4 process-recordings-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <div>
          <h2 className="h4 mb-1">Process Recordings</h2>
          <div className="text-muted small mobile-page-subtitle">Counseling session notes and resident healing history</div>
        </div>
        {isAdmin && (
          <div className="mobile-page-actions">
            <button className="btn btn-primary btn-sm" onClick={handleNew} disabled={selectedResidentId == null}>
              + Add Session Note
            </button>
          </div>
        )}
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label small">Search residents</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={residentSearch}
                onChange={(e) => setResidentSearch(e.target.value)}
                placeholder="Filter by ID, code, or social worker"
              />
            </div>
            <div className="col-md-7">
              <label className="form-label small">Resident</label>
              <select
                className="form-select form-select-sm"
                value={String(selectedResidentId ?? '')}
                onChange={(e) => changeResident(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingResidents}
              >
                <option value="">Select a resident...</option>
                {residentOptions.map((resident) => (
                  <option key={resident.residentId} value={resident.residentId}>
                    {resident.residentId} - {resident.internalCode ?? 'No code'}
                    {resident.assignedSocialWorker ? ` • ${resident.assignedSocialWorker}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedResident ? (
        <div className="alert alert-info d-flex justify-content-between align-items-center">
          <div>
            <strong>{selectedResident.internalCode ?? `Resident ${selectedResident.residentId}`}</strong>
            <span className="ms-2 text-muted">{selectedResident.assignedSocialWorker ?? 'No social worker assigned'}</span>
          </div>
          <div className="text-muted small">Displaying records oldest to newest</div>
        </div>
      ) : null}

      {loadingRecordings ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : selectedResidentId == null ? (
        <div className="alert alert-secondary">Choose a resident to view the full counseling session history.</div>
      ) : sortedRecordings.length === 0 ? (
        <div className="alert alert-warning">No process recordings found for this resident.</div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="small text-muted">
              Showing {sortedRecordings.length} of {totalRecordings} records
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loadingRecordings}
              >
                Previous
              </button>
              <span className="small text-muted">Page {currentPage} of {totalPages}</span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loadingRecordings}
              >
                Next
              </button>
            </div>
          </div>

          <div className="vstack gap-3">
            {sortedRecordings.map((recording) => (
            <div className="card shadow-sm" key={recording.recordingId}>
              <div className="card-header d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <div className="flex-shrink-0">
                  <div className="fw-semibold">{recording.sessionDate ?? 'No date'}</div>
                  <div className="text-muted small">
                    {recording.socialWorker ?? 'Unknown social worker'} • {recording.sessionType ?? 'Session type not set'}
                    {recording.sessionDurationMinutes != null ? ` • ${recording.sessionDurationMinutes} min` : ''}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
                  {recording.progressNoted ? <span className="badge text-bg-success">Progress noted</span> : <span className="badge text-bg-secondary">No progress</span>}
                  {recording.concernsFlagged ? <span className="badge text-bg-warning">Concerns</span> : null}
                  {recording.referralMade ? <span className="badge text-bg-info">Referral made</span> : null}
                  {isAdmin && (
                    <>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleEdit(recording)}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(recording.recordingId)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Emotional State Observed</div>
                    <div>{recording.emotionalStateObserved ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Emotional State at End</div>
                    <div>{recording.emotionalStateEnd ?? '—'}</div>
                  </div>
                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Resident</div>
                    <div>{recording.residentId ?? '—'}</div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted mb-1">Session Narrative</div>
                    <div className="process-recording-body">{recording.sessionNarrative ?? '—'}</div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted mb-1">Interventions Applied</div>
                    <div className="process-recording-body">{recording.interventionsApplied ?? '—'}</div>
                  </div>
                  <div className="col-12">
                    <div className="small text-muted mb-1">Follow-up Actions</div>
                    <div className="process-recording-body">{recording.followUpActions ?? '—'}</div>
                  </div>
                  {recording.notesRestricted ? (
                    <div className="col-12">
                      <div className="small text-muted mb-1">Restricted Notes</div>
                      <div className="process-recording-body">{recording.notesRestricted}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            ))}
          </div>
        </>
      )}

      {showModal && editingRecording && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingRecording.recordingId ? 'Edit Process Recording' : 'Add Process Recording'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingRecording.residentId ?? selectedResidentId ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev)}
                    >
                      <option value="">Select resident...</option>
                      {residents.map((resident) => (
                        <option key={resident.residentId} value={resident.residentId}>
                          {resident.residentId} - {resident.internalCode ?? 'No code'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Session Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={String(editingRecording.sessionDate ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, sessionDate: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Social Worker</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.socialWorker ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, socialWorker: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Session Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingRecording.sessionType ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, sessionType: e.target.value } : prev)}
                    >
                      <option value="">Select session type...</option>
                      {SESSION_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Duration Minutes</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={String(editingRecording.sessionDurationMinutes ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, sessionDurationMinutes: Number(e.target.value) || undefined } : prev)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Emotional State Observed</label>
                    <input
                      list="emotional-states"
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.emotionalStateObserved ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, emotionalStateObserved: e.target.value } : prev)}
                    />
                    <datalist id="emotional-states">
                      {EMOTIONAL_STATE_OPTIONS.map((state) => <option key={state} value={state} />)}
                    </datalist>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Emotional State at End</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.emotionalStateEnd ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, emotionalStateEnd: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Session Narrative</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={4}
                      value={String(editingRecording.sessionNarrative ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, sessionNarrative: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Interventions Applied</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={String(editingRecording.interventionsApplied ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, interventionsApplied: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Follow-up Actions</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={String(editingRecording.followUpActions ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, followUpActions: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Restricted Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={String(editingRecording.notesRestricted ?? '')}
                      onChange={(e) => setEditingRecording(prev => prev ? { ...prev, notesRestricted: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-4">
                    <div className="form-check mt-3">
                      <input
                        id="progressNoted"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.progressNoted)}
                        onChange={(e) => setEditingRecording(prev => prev ? { ...prev, progressNoted: e.target.checked } : prev)}
                      />
                      <label className="form-check-label small" htmlFor="progressNoted">Progress Noted</label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check mt-3">
                      <input
                        id="concernsFlagged"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.concernsFlagged)}
                        onChange={(e) => setEditingRecording(prev => prev ? { ...prev, concernsFlagged: e.target.checked } : prev)}
                      />
                      <label className="form-check-label small" htmlFor="concernsFlagged">Concerns Flagged</label>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check mt-3">
                      <input
                        id="referralMade"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.referralMade)}
                        onChange={(e) => setEditingRecording(prev => prev ? { ...prev, referralMade: e.target.checked } : prev)}
                      />
                      <label className="form-check-label small" htmlFor="referralMade">Referral Made</label>
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

export default ProcessRecordingsPage;