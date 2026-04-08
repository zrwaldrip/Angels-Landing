import { useEffect, useMemo, useState } from 'react';
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

function dateLabel(raw: string | undefined) {
  if (!raw) return 'Unspecified';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString();
}

function dateForInput(raw: string | undefined) {
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function compareBySessionDateAsc(a: ProcessRecording, b: ProcessRecording) {
  const aTime = Date.parse(a.sessionDate ?? '');
  const bTime = Date.parse(b.sessionDate ?? '');
  const safeATime = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
  const safeBTime = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
  if (safeATime !== safeBTime) return safeATime - safeBTime;
  return a.recordingId - b.recordingId;
}

function ProcessRecordingsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState<number | ''>('');
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingRecording, setEditingRecording] = useState<Partial<ProcessRecording> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void loadResidents();
      void loadRecordings();
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void loadRecordings();
    }
  }, [selectedResidentId]);

  async function loadResidents() {
    try {
      const result = await getResidents({ page: 1, pageSize: 500 });
      setResidents(result.items);
    } catch {
      setResidents([]);
    }
  }

  async function loadRecordings() {
    setLoading(true);
    setError('');
    try {
      const residentId = selectedResidentId === '' ? undefined : Number(selectedResidentId);
      const data = await getProcessRecordings(residentId);
      setRecordings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load process recordings.');
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setEditingRecording({
      residentId: selectedResidentId === '' ? undefined : Number(selectedResidentId),
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

    const residentId = Number(editingRecording.residentId);
    if (!residentId) {
      setSaveError('Resident is required.');
      return;
    }

    const payload: Partial<ProcessRecording> = {
      ...editingRecording,
      residentId,
      sessionDate: String(editingRecording.sessionDate ?? '').trim() || undefined,
      socialWorker: String(editingRecording.socialWorker ?? '').trim() || undefined,
      sessionType: String(editingRecording.sessionType ?? '').trim() || undefined,
      sessionDurationMinutes:
        editingRecording.sessionDurationMinutes != null && String(editingRecording.sessionDurationMinutes).trim() !== ''
          ? Number(editingRecording.sessionDurationMinutes)
          : undefined,
      emotionalStateObserved: String(editingRecording.emotionalStateObserved ?? '').trim() || undefined,
      sessionNarrative: String(editingRecording.sessionNarrative ?? '').trim() || undefined,
      interventionsApplied: String(editingRecording.interventionsApplied ?? '').trim() || undefined,
      followUpActions: String(editingRecording.followUpActions ?? '').trim() || undefined,
      emotionalStateEnd: String(editingRecording.emotionalStateEnd ?? '').trim() || undefined,
      notesRestricted: String(editingRecording.notesRestricted ?? '').trim() || undefined,
      progressNoted: Boolean(editingRecording.progressNoted),
      concernsFlagged: Boolean(editingRecording.concernsFlagged),
      referralMade: Boolean(editingRecording.referralMade),
    };

    setSaving(true);
    setSaveError('');
    try {
      if (editingRecording.recordingId) {
        await updateProcessRecording(editingRecording.recordingId, {
          ...payload,
          recordingId: editingRecording.recordingId,
        });
      } else {
        await createProcessRecording(payload);
      }
      setShowModal(false);
      await loadRecordings();
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
      await loadRecordings();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete process recording.');
    }
  }

  const residentNameById = useMemo(() => {
    const map = new Map<number, string>();
    residents.forEach((r) => {
      const label = r.internalCode?.trim() || r.caseControlNo?.trim() || `Resident ${r.residentId}`;
      map.set(r.residentId, label);
    });
    return map;
  }, [residents]);

  const sortedRecordings = useMemo(
    () => [...recordings].sort(compareBySessionDateAsc),
    [recordings]
  );

  return (
    <div className="container mt-4">
      <Header />

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Process Recordings</h2>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={handleNew}>
            + Add Session Note
          </button>
        )}
      </div>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-md-5">
          <label className="form-label small">Resident</label>
          <select
            className="form-select form-select-sm"
            value={String(selectedResidentId)}
            onChange={(e) => {
              const next = e.target.value;
              setSelectedResidentId(next ? Number(next) : '');
            }}
          >
            <option value="">All residents</option>
            {residents.map((r) => (
              <option key={r.residentId} value={r.residentId}>
                {r.internalCode || r.caseControlNo || `Resident ${r.residentId}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <div className="row g-3">
          {sortedRecordings.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-secondary mb-0">No process recordings found for the selected resident.</div>
            </div>
          ) : (
            sortedRecordings.map((recording) => (
              <div className="col-12" key={recording.recordingId}>
                <article className="card shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <h3 className="h6 mb-1">{dateLabel(recording.sessionDate)}</h3>
                        <div className="small text-muted">
                          {residentNameById.get(recording.residentId ?? -1) ?? `Resident ${recording.residentId ?? 'Unknown'}`}
                          {' • '}
                          {recording.socialWorker || 'Unassigned social worker'}
                          {' • '}
                          {recording.sessionType || 'Session type not set'}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {recording.progressNoted ? <span className="badge text-bg-success">Progress Noted</span> : null}
                        {recording.concernsFlagged ? <span className="badge text-bg-warning">Concerns Flagged</span> : null}
                        {recording.referralMade ? <span className="badge text-bg-info">Referral Made</span> : null}
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="small text-muted">Emotional State Observed</div>
                        <div>{recording.emotionalStateObserved || 'Not specified'}</div>
                      </div>
                      <div className="col-md-6">
                        <div className="small text-muted">Emotional State End</div>
                        <div>{recording.emotionalStateEnd || 'Not specified'}</div>
                      </div>
                      <div className="col-12">
                        <div className="small text-muted">Session Narrative</div>
                        <div>{recording.sessionNarrative || 'No narrative provided.'}</div>
                      </div>
                      <div className="col-md-6">
                        <div className="small text-muted">Interventions Applied</div>
                        <div>{recording.interventionsApplied || 'None recorded'}</div>
                      </div>
                      <div className="col-md-6">
                        <div className="small text-muted">Follow-up Actions</div>
                        <div>{recording.followUpActions || 'None recorded'}</div>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="mt-3 d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => handleEdit(recording)}>
                          Edit
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(recording.recordingId)}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && editingRecording && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingRecording.recordingId ? 'Edit Process Recording' : 'Add Process Recording'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small">Resident</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingRecording.residentId ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) =>
                          prev ? { ...prev, residentId: Number(e.target.value) || undefined } : prev
                        )
                      }
                    >
                      <option value="">Select resident...</option>
                      {residents.map((r) => (
                        <option key={r.residentId} value={r.residentId}>
                          {r.internalCode || r.caseControlNo || `Resident ${r.residentId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Session Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={dateForInput(editingRecording.sessionDate)}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, sessionDate: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Social Worker</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.socialWorker ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, socialWorker: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">Session Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingRecording.sessionType ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, sessionType: e.target.value } : prev))
                      }
                    >
                      {SESSION_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small">Minutes</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control form-control-sm"
                      value={String(editingRecording.sessionDurationMinutes ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) =>
                          prev
                            ? {
                                ...prev,
                                sessionDurationMinutes: e.target.value === '' ? undefined : Number(e.target.value),
                              }
                            : prev
                        )
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Emotional State Observed</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.emotionalStateObserved ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) =>
                          prev ? { ...prev, emotionalStateObserved: e.target.value } : prev
                        )
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Emotional State End</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={String(editingRecording.emotionalStateEnd ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, emotionalStateEnd: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Session Narrative</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={4}
                      value={String(editingRecording.sessionNarrative ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, sessionNarrative: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Interventions Applied</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={String(editingRecording.interventionsApplied ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) =>
                          prev ? { ...prev, interventionsApplied: e.target.value } : prev
                        )
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Follow-up Actions</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={String(editingRecording.followUpActions ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, followUpActions: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Restricted Notes</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={String(editingRecording.notesRestricted ?? '')}
                      onChange={(e) =>
                        setEditingRecording((prev) => (prev ? { ...prev, notesRestricted: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <div className="form-check mt-1">
                      <input
                        id="progressNoted"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.progressNoted)}
                        onChange={(e) =>
                          setEditingRecording((prev) => (prev ? { ...prev, progressNoted: e.target.checked } : prev))
                        }
                      />
                      <label htmlFor="progressNoted" className="form-check-label small">Progress noted</label>
                    </div>
                    <div className="form-check mt-2">
                      <input
                        id="concernsFlagged"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.concernsFlagged)}
                        onChange={(e) =>
                          setEditingRecording((prev) => (prev ? { ...prev, concernsFlagged: e.target.checked } : prev))
                        }
                      />
                      <label htmlFor="concernsFlagged" className="form-check-label small">Concerns flagged</label>
                    </div>
                    <div className="form-check mt-2">
                      <input
                        id="referralMade"
                        type="checkbox"
                        className="form-check-input"
                        checked={Boolean(editingRecording.referralMade)}
                        onChange={(e) =>
                          setEditingRecording((prev) => (prev ? { ...prev, referralMade: e.target.checked } : prev))
                        }
                      />
                      <label htmlFor="referralMade" className="form-check-label small">Referral made</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Recording'}
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
