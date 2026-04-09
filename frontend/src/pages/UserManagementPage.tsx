import { useEffect, useState } from 'react';
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

  function setAccessLevel(level: 'Admin' | 'Donor') {
    setEditingUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        roles: level === 'Admin' ? ['Admin', 'Donor'] : ['Donor'],
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

  const normalizedSearch = search.trim().toLowerCase();
  const visibleUsers = normalizedSearch.length === 0
    ? users
    : users.filter((u) =>
        (u.email ?? '').toLowerCase().includes(normalizedSearch) ||
        (u.userName ?? '').toLowerCase().includes(normalizedSearch) ||
        u.roles.some((role) => role.toLowerCase().includes(normalizedSearch))
      );

  return (
    <div className="container mt-4 user-management-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">User Management</h2>
        <div className="d-flex gap-2 mobile-page-actions">
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadUsers()} disabled={loadingUsers}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loadingUsers ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th>Email</th>
                <th>User Name</th>
                <th>Roles</th>
                <th>Email Confirmed</th>
                <th>Lockout Enabled</th>
                <th>MFA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email ?? '—'}</td>
                  <td>{user.userName ?? '—'}</td>
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
