import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { deleteAdminUser, getAdminUsers, updateAdminUser, type AdminUser } from '../lib/authAPI';

function UserManagementPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAccessLevels, setSelectedAccessLevels] = useState<string[]>([]);
  const [selectedEmailConfirmed, setSelectedEmailConfirmed] = useState<string[]>([]);
  const [selectedLockout, setSelectedLockout] = useState<string[]>([]);
  const [selectedMfa, setSelectedMfa] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'email' | 'roles' | 'emailConfirmed' | 'lockoutEnabled' | 'twoFactorEnabled'>('email');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin) void loadUsers();
  }, [isAuthenticated, isLoading, isAdmin]);

  async function loadUsers() {
    setLoadingUsers(true);
    setError('');
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }

  function startEdit(user: AdminUser) {
    setEditingUser({ ...user, roles: [...user.roles] });
    setSaveError('');
    setShowModal(true);
  }

  function getAccessLevel(user: AdminUser): 'Admin' | 'Donor' {
    return user.roles.includes('Admin') ? 'Admin' : 'Donor';
  }

  function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  }

  function setAccessLevel(level: 'Admin' | 'Donor') {
    setEditingUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        // Admin users inherit donor capabilities through authorization checks.
        roles: level === 'Admin' ? ['Admin'] : ['Donor'],
      };
    });
  }

  async function saveUser() {
    if (!editingUser) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateAdminUser(editingUser.id, {
        roles: editingUser.roles,
        emailConfirmed: editingUser.emailConfirmed,
        lockoutEnabled: editingUser.lockoutEnabled,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setShowModal(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(user: AdminUser) {
    const label = user.email ?? user.userName ?? user.id;
    if (!confirm(`Delete user "${label}"? This action cannot be undone.`)) return;
    try {
      await deleteAdminUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user.');
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-warning">Please <Link to="/login">sign in</Link> to manage users.</div>
      </div>
    );
  }

  if (!isLoading && isAuthenticated && !isAdmin) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-danger">Only admins can access user management.</div>
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const searchMatch = normalizedSearch.length === 0
        || (user.email ?? '').toLowerCase().includes(normalizedSearch)
        || (user.userName ?? '').toLowerCase().includes(normalizedSearch)
        || user.roles.some((role) => role.toLowerCase().includes(normalizedSearch));
      const accessLevel = getAccessLevel(user);
      const accessMatch = selectedAccessLevels.length === 0 || selectedAccessLevels.includes(accessLevel);
      const emailConfirmedBucket = user.emailConfirmed ? 'yes' : 'no';
      const emailConfirmedMatch = selectedEmailConfirmed.length === 0 || selectedEmailConfirmed.includes(emailConfirmedBucket);
      const lockoutBucket = user.lockoutEnabled ? 'yes' : 'no';
      const lockoutMatch = selectedLockout.length === 0 || selectedLockout.includes(lockoutBucket);
      const mfaBucket = user.twoFactorEnabled ? 'enabled' : 'disabled';
      const mfaMatch = selectedMfa.length === 0 || selectedMfa.includes(mfaBucket);
      return searchMatch && accessMatch && emailConfirmedMatch && lockoutMatch && mfaMatch;
    });
  }, [users, search, selectedAccessLevels, selectedEmailConfirmed, selectedLockout, selectedMfa]);

  const sortedUsers = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filteredUsers].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortKey) {
        case 'email':
          av = String(a.email ?? '').toLowerCase(); bv = String(b.email ?? '').toLowerCase(); break;
        case 'roles':
          av = a.roles.join(', ').toLowerCase(); bv = b.roles.join(', ').toLowerCase(); break;
        case 'emailConfirmed':
          av = a.emailConfirmed ? 1 : 0; bv = b.emailConfirmed ? 1 : 0; break;
        case 'lockoutEnabled':
          av = a.lockoutEnabled ? 1 : 0; bv = b.lockoutEnabled ? 1 : 0; break;
        case 'twoFactorEnabled':
          av = a.twoFactorEnabled ? 1 : 0; bv = b.twoFactorEnabled ? 1 : 0; break;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filteredUsers, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedAccessLevels, selectedEmailConfirmed, selectedLockout, selectedMfa, pageSize]);

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
    <div className="container mt-4 user-management-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">User Management</h2>
        <div className="d-flex gap-2 mobile-page-actions">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadUsers()} disabled={loadingUsers}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loadingUsers ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="row g-3">
          <div className="col-lg-3">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Filters</h6>
                <label className="form-label small mb-1">Search</label>
                <input
                  type="search"
                  className="form-control form-control-sm mb-3"
                  placeholder="Email, username, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="small text-muted fw-semibold mb-1">Access Level</div>
                <div className="mb-3">
                  {['Admin', 'Donor'].map((level) => (
                    <div className="form-check" key={level}>
                      <input className="form-check-input" type="checkbox" id={`access-${level}`} checked={selectedAccessLevels.includes(level)} onChange={() => toggleSelection(setSelectedAccessLevels, level)} />
                      <label className="form-check-label small" htmlFor={`access-${level}`}>{level}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Email Confirmed</div>
                <div className="mb-3">
                  {[
                    { key: 'yes', label: 'Yes' },
                    { key: 'no', label: 'No' },
                  ].map((option) => (
                    <div className="form-check" key={option.key}>
                      <input className="form-check-input" type="checkbox" id={`email-confirmed-${option.key}`} checked={selectedEmailConfirmed.includes(option.key)} onChange={() => toggleSelection(setSelectedEmailConfirmed, option.key)} />
                      <label className="form-check-label small" htmlFor={`email-confirmed-${option.key}`}>{option.label}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">Lockout Enabled</div>
                <div className="mb-3">
                  {[
                    { key: 'yes', label: 'Yes' },
                    { key: 'no', label: 'No' },
                  ].map((option) => (
                    <div className="form-check" key={option.key}>
                      <input className="form-check-input" type="checkbox" id={`lockout-${option.key}`} checked={selectedLockout.includes(option.key)} onChange={() => toggleSelection(setSelectedLockout, option.key)} />
                      <label className="form-check-label small" htmlFor={`lockout-${option.key}`}>{option.label}</label>
                    </div>
                  ))}
                </div>

                <div className="small text-muted fw-semibold mb-1">MFA</div>
                <div className="mb-3">
                  {[
                    { key: 'enabled', label: 'Enabled' },
                    { key: 'disabled', label: 'Disabled' },
                  ].map((option) => (
                    <div className="form-check" key={option.key}>
                      <input className="form-check-input" type="checkbox" id={`mfa-${option.key}`} checked={selectedMfa.includes(option.key)} onChange={() => toggleSelection(setSelectedMfa, option.key)} />
                      <label className="form-check-label small" htmlFor={`mfa-${option.key}`}>{option.label}</label>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setSelectedAccessLevels([]);
                    setSelectedEmailConfirmed([]);
                    setSelectedLockout([]);
                    setSelectedMfa([]);
                  }}
                >
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
                <th role="button" onClick={() => toggleSort('email')}>Email{sortIndicator('email')}</th>
                <th role="button" onClick={() => toggleSort('roles')}>Roles{sortIndicator('roles')}</th>
                <th role="button" onClick={() => toggleSort('emailConfirmed')}>Email Confirmed{sortIndicator('emailConfirmed')}</th>
                <th role="button" onClick={() => toggleSort('lockoutEnabled')}>Lockout Enabled{sortIndicator('lockoutEnabled')}</th>
                <th role="button" onClick={() => toggleSort('twoFactorEnabled')}>MFA{sortIndicator('twoFactorEnabled')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email ?? '—'}</td>
                  <td>{user.roles.join(', ') || '—'}</td>
                  <td>{user.emailConfirmed ? 'Yes' : 'No'}</td>
                  <td>{user.lockoutEnabled ? 'Yes' : 'No'}</td>
                  <td>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => void handleDeleteUser(user)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-2 mt-2 mb-4 flex-wrap">
          <small className="text-muted">{sortedUsers.length} users total</small>
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

      {showModal && editingUser ? (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit User</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="small text-muted mb-2">
                  {editingUser.email ?? editingUser.userName}
                </div>
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="mb-3">
                  <label className="form-label">Access Level</label>
                  <select
                    className="form-select"
                    value={getAccessLevel(editingUser)}
                    onChange={(e) => setAccessLevel(e.target.value === 'Admin' ? 'Admin' : 'Donor')}
                  >
                    <option value="Donor">Donor</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <div className="form-text">Admin includes donor privileges. Donor is donor-only access.</div>
                </div>
                <div className="form-check mb-2">
                  <input
                    id="user-email-confirmed"
                    type="checkbox"
                    className="form-check-input"
                    checked={editingUser.emailConfirmed}
                    onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, emailConfirmed: e.target.checked } : prev))}
                  />
                  <label htmlFor="user-email-confirmed" className="form-check-label">Email confirmed</label>
                </div>
                <div className="form-check mb-2">
                  <input
                    id="user-lockout-enabled"
                    type="checkbox"
                    className="form-check-input"
                    checked={editingUser.lockoutEnabled}
                    onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, lockoutEnabled: e.target.checked } : prev))}
                  />
                  <label htmlFor="user-lockout-enabled" className="form-check-label">Lockout enabled</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => void saveUser()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserManagementPage;
