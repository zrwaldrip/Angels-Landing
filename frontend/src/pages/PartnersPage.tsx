import { useEffect, useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'partnerId' | 'partnerName' | 'partnerType' | 'roleType' | 'contactName' | 'region' | 'status'>('partnerId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [contactPartner, setContactPartner] = useState<Partner | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const partnerTypeOptions = Array.from(
    new Set([
      ...PARTNER_TYPE_OPTIONS,
      ...partners.map((p) => p.partnerType).filter((value): value is string => Boolean(value && value.trim())),
      ...(editingPartner?.partnerType ? [editingPartner.partnerType] : [])
    ])
  );

  const roleTypeOptions = Array.from(
    new Set([
      ...ROLE_TYPE_OPTIONS,
      ...partners.map((p) => p.roleType).filter((value): value is string => Boolean(value && value.trim())),
      ...(editingPartner?.roleType ? [editingPartner.roleType] : [])
    ])
  );
  const statusOptions = Array.from(
    new Set([
      ...STATUS_OPTIONS,
      ...partners.map((p) => p.status).filter((value): value is string => Boolean(value && value.trim())),
    ])
  );

  function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  const filteredPartners = useMemo(() => {
    const query = search.trim().toLowerCase();
    return partners.filter((partner) => {
      const searchMatch = !query || [
        partner.partnerName,
        partner.contactName,
        partner.email,
        partner.region,
      ].some((value) => String(value ?? '').toLowerCase().includes(query));
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(partner.partnerType ?? '');
      const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(partner.roleType ?? '');
      const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(partner.status ?? '');
      return searchMatch && typeMatch && roleMatch && statusMatch;
    });
  }, [partners, search, selectedTypes, selectedRoles, selectedStatuses]);

  const sortedPartners = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredPartners].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortKey) {
        case 'partnerId':
          av = a.partnerId ?? 0; bv = b.partnerId ?? 0; break;
        case 'partnerName':
          av = String(a.partnerName ?? '').toLowerCase(); bv = String(b.partnerName ?? '').toLowerCase(); break;
        case 'partnerType':
          av = String(a.partnerType ?? '').toLowerCase(); bv = String(b.partnerType ?? '').toLowerCase(); break;
        case 'roleType':
          av = String(a.roleType ?? '').toLowerCase(); bv = String(b.roleType ?? '').toLowerCase(); break;
        case 'contactName':
          av = String(a.contactName ?? '').toLowerCase(); bv = String(b.contactName ?? '').toLowerCase(); break;
        case 'region':
          av = String(a.region ?? '').toLowerCase(); bv = String(b.region ?? '').toLowerCase(); break;
        case 'status':
          av = String(a.status ?? '').toLowerCase(); bv = String(b.status ?? '').toLowerCase(); break;
        default:
          av = 0; bv = 0;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredPartners, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedPartners.length / pageSize));
  const pagedPartners = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPartners.slice(start, start + pageSize);
  }, [sortedPartners, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedTypes, selectedRoles, selectedStatuses, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  function sortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Partners</h2>
        {isAdmin && (
          <div className="mobile-page-actions">
            <button className="btn btn-primary btn-sm" onClick={handleNew}>+ Add Partner</button>
          </div>
        )}
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Search</label>
                <input
                  type="text"
                  className="form-control form-control-sm mb-3"
                  placeholder="Name, contact, email, region..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="small text-muted fw-semibold mb-1">Type</div>
                <div className="mb-3">
                  {partnerTypeOptions.map((option) => (
                    <div className="form-check" key={`type-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`type-${option}`} checked={selectedTypes.includes(option)} onChange={() => toggleSelection(setSelectedTypes, option)} />
                      <label className="form-check-label small" htmlFor={`type-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Role</div>
                <div className="mb-3">
                  {roleTypeOptions.map((option) => (
                    <div className="form-check" key={`role-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`role-${option}`} checked={selectedRoles.includes(option)} onChange={() => toggleSelection(setSelectedRoles, option)} />
                      <label className="form-check-label small" htmlFor={`role-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Status</div>
                <div className="mb-3">
                  {statusOptions.map((option) => (
                    <div className="form-check" key={`status-${option}`}>
                      <input className="form-check-input" type="checkbox" id={`status-${option}`} checked={selectedStatuses.includes(option)} onChange={() => toggleSelection(setSelectedStatuses, option)} />
                      <label className="form-check-label small" htmlFor={`status-${option}`}>{option}</label>
                    </div>
                  ))}
                </div>

                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setSearch(''); setSelectedTypes([]); setSelectedRoles([]); setSelectedStatuses([]); }}>
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
          <div className="col-lg-9">
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead className="table-light">
                  <tr>
                    <th role="button" onClick={() => toggleSort('partnerId')}>ID{sortIndicator('partnerId')}</th>
                    <th role="button" onClick={() => toggleSort('partnerName')}>Name{sortIndicator('partnerName')}</th>
                    <th role="button" onClick={() => toggleSort('partnerType')}>Type{sortIndicator('partnerType')}</th>
                    <th role="button" onClick={() => toggleSort('roleType')}>Role{sortIndicator('roleType')}</th>
                    <th role="button" onClick={() => toggleSort('contactName')}>Contact{sortIndicator('contactName')}</th>
                    <th>Contact Info</th>
                    <th role="button" onClick={() => toggleSort('region')}>Region{sortIndicator('region')}</th>
                    <th role="button" onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagedPartners.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 9 : 8} className="text-center text-muted py-3">No partners match the selected filters.</td></tr>
                  ) : pagedPartners.map((p) => (
                    <tr key={p.partnerId}>
                      <td>{p.partnerId}</td>
                      <td>{p.partnerName}</td>
                      <td><span className="badge text-bg-info">{p.partnerType}</span></td>
                      <td>{p.roleType}</td>
                      <td>{p.contactName}</td>
                      <td>
                        <button
                          className="btn btn-outline-info btn-sm d-inline-flex align-items-center justify-content-center"
                          title="View contact information"
                          aria-label={`View contact information for ${p.partnerName ?? 'partner'}`}
                          onClick={() => setContactPartner(p)}
                        >
                          View
                        </button>
                      </td>
                      <td>{p.region}</td>
                      <td><span className={`badge ${p.status === 'Active' ? 'text-bg-success' : p.status === 'Inactive' ? 'text-bg-secondary' : 'text-bg-warning'}`}>{p.status}</span></td>
                      {isAdmin && (
                        <td className="text-nowrap">
                          <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEdit(p)}>Edit</button>
                          <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(p.partnerId)}>Delete</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
              <small className="text-muted">{filteredPartners.length} partners total</small>
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted mb-0">Per page</label>
                <select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
                <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                <span className="small text-muted">Page {page} of {totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
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
                      {partnerTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
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
                      {roleTypeOptions.map((r) => <option key={r} value={r}>{r}</option>)}
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

      {contactPartner ? (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Contact Info</h5>
                <button type="button" className="btn-close" onClick={() => setContactPartner(null)} />
              </div>
              <div className="modal-body">
                <div className="small text-muted mb-2">{contactPartner.partnerName ?? 'Partner'}</div>
                <div className="mb-2">
                  <div className="small text-muted">Email</div>
                  <div>{contactPartner.email || 'No email provided'}</div>
                </div>
                <div>
                  <div className="small text-muted">Phone</div>
                  <div>{contactPartner.phone || 'No phone provided'}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setContactPartner(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PartnersPage;
