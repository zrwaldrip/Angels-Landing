import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getPartners, createPartner, updatePartner, deletePartner, type Partner } from '../lib/lighthouseAPI';

const PARTNER_TYPE_OPTIONS = ['NGO', 'Government', 'Corporate', 'Educational', 'Healthcare', 'Community'] as const;
const ROLE_TYPE_OPTIONS = ['Strategic Partner', 'Service Provider', 'Donor', 'Advocate', 'Research'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'] as const;

function PartnersPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<Partner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadPartners();
  }, [isAuthenticated, isLoading]);

  async function loadPartners() {
    setLoading(true);
    setError('');
    try {
      const data = await getPartners();
      setPartners(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partners.');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(partner: Partner) {
    setEditingPartner({ ...partner });
    setSaveError('');
    setShowModal(true);
  }

  function handleNew() {
    setEditingPartner({});
    setSaveError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingPartner) return;
    setSaving(true);
    setSaveError('');
    try {
      if (editingPartner.partnerId) {
        await updatePartner(editingPartner.partnerId, editingPartner);
      } else {
        await createPartner(editingPartner);
      }
      setShowModal(false);
      await loadPartners();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this partner record?')) return;
    try {
      await deletePartner(id);
      await loadPartners();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete.');
    }
  }

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Partners</h2>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={handleNew}>+ Add Partner</button>
        )}
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
                  <th>Name</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Region</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.partnerId}>
                    <td>{p.partnerId}</td>
                    <td>{p.partnerName}</td>
                    <td><span className="badge text-bg-info">{p.partnerType}</span></td>
                    <td>{p.roleType}</td>
                    <td>{p.contactName}</td>
                    <td>{p.email}</td>
                    <td>{p.phone}</td>
                    <td>{p.region}</td>
                    <td><span className={`badge ${p.status === 'Active' ? 'text-bg-success' : p.status === 'Inactive' ? 'text-bg-secondary' : 'text-bg-warning'}`}>{p.status}</span></td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEdit(p)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(p.partnerId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {partners.length === 0 && <div className="alert alert-info">No partners found.</div>}
        </>
      )}

      {/* Modal */}
      {showModal && editingPartner && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingPartner.partnerId ? 'Edit Partner' : 'Add Partner'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small">Partner Name</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingPartner.partnerName ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, partnerName: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingPartner.partnerType ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, partnerType: e.target.value } : prev)}
                    >
                      <option value="">Select type...</option>
                      {PARTNER_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Role</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingPartner.roleType ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, roleType: e.target.value } : prev)}
                    >
                      <option value="">Select role...</option>
                      {ROLE_TYPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Contact Name</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingPartner.contactName ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, contactName: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Email</label>
                    <input
                      type="email" className="form-control form-control-sm"
                      value={String(editingPartner.email ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, email: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Phone</label>
                    <input
                      type="tel" className="form-control form-control-sm"
                      value={String(editingPartner.phone ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Region</label>
                    <input
                      type="text" className="form-control form-control-sm"
                      value={String(editingPartner.region ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, region: e.target.value } : prev)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">Status</label>
                    <select
                      className="form-select form-select-sm"
                      value={String(editingPartner.status ?? '')}
                      onChange={(e) => setEditingPartner(prev => prev ? { ...prev, status: e.target.value } : prev)}
                    >
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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

export default PartnersPage;
