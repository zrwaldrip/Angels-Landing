import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getDonations, getSupporters, createDonation, updateDonation, deleteDonation, type Donation, type Supporter } from '../lib/lighthouseAPI';

function DonationsPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');

  const [donations, setDonations] = useState<Donation[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Partial<Donation> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [activeTab, setActiveTab] = useState<'donations' | 'supporters'>('donations');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void loadDonations();
      void loadSupporters();
    }
  }, [isAuthenticated, isLoading, page]);

  async function loadDonations() {
    setLoading(true);
    setError('');
    try {
      const result = await getDonations({ page, pageSize });
      setDonations(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSupporters() {
    try {
      const result = await getSupporters({ page: 1, pageSize: 100 });
      setSupporters(result.items);
    } catch { /* ignore */ }
  }

  function handleEdit(donation: Donation) {
    setEditingDonation({ ...donation });
    setSaveError('');
    setShowModal(true);
  }

  function handleNew() {
    setEditingDonation({});
    setSaveError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingDonation) return;
    setSaving(true); setSaveError('');
    try {
      if (editingDonation.donationId) {
        await updateDonation(editingDonation.donationId, editingDonation);
      } else {
        await createDonation(editingDonation);
      }
      setShowModal(false);
      await loadDonations();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this donation record?')) return;
    try {
      await deleteDonation(id);
      await loadDonations();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete.'); }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mt-4">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="h4 mb-0">Donations & Supporters</h2>
        {isAdmin && activeTab === 'donations' && (
          <button className="btn btn-primary btn-sm" onClick={handleNew}>+ Add Donation</button>
        )}
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'donations' ? 'active' : ''}`} onClick={() => setActiveTab('donations')}>Donations</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'supporters' ? 'active' : ''}`} onClick={() => setActiveTab('supporters')}>Supporters</button>
        </li>
      </ul>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : activeTab === 'donations' ? (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Supporter</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Channel</th>
                  <th>Campaign</th>
                  <th>Recurring</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.donationId}>
                    <td>{d.donationId}</td>
                    <td>{d.supporterId}</td>
                    <td><span className="badge text-bg-info">{d.donationType}</span></td>
                    <td>{d.donationDate}</td>
                    <td>{d.amount != null ? d.amount.toFixed(2) : d.estimatedValue?.toFixed(2)}</td>
                    <td>{d.currencyCode}</td>
                    <td>{d.channelSource}</td>
                    <td>{d.campaignName}</td>
                    <td>{d.isRecurring ? '✓' : ''}</td>
                    {isAdmin && (
                      <td>
                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEdit(d)}>Edit</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(d.donationId)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">{total} donations total</small>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="btn btn-sm disabled">Page {page} of {totalPages}</span>
              <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Display Name</th>
                <th>Type</th>
                <th>Email</th>
                <th>Region</th>
                <th>Country</th>
                <th>Status</th>
                <th>Channel</th>
              </tr>
            </thead>
            <tbody>
              {supporters.map((s) => (
                <tr key={s.supporterId}>
                  <td>{s.supporterId}</td>
                  <td>{s.displayName}</td>
                  <td>{s.supporterType}</td>
                  <td>{s.email}</td>
                  <td>{s.region}</td>
                  <td>{s.country}</td>
                  <td><span className={`badge ${s.status === 'Active' ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.status}</span></td>
                  <td>{s.acquisitionChannel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && editingDonation && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingDonation.donationId ? 'Edit Donation' : 'Add Donation'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                {saveError ? <div className="alert alert-danger">{saveError}</div> : null}
                <div className="row g-3">
                  {[
                    ['donationType', 'Type'], ['donationDate', 'Date'],
                    ['currencyCode', 'Currency'], ['amount', 'Amount'],
                    ['channelSource', 'Channel'], ['campaignName', 'Campaign'],
                  ].map(([field, label]) => (
                    <div className="col-md-6" key={field}>
                      <label className="form-label small">{label}</label>
                      <input
                        type="text" className="form-control form-control-sm"
                        value={String(editingDonation[field as keyof Donation] ?? '')}
                        onChange={(e) => setEditingDonation(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
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

export default DonationsPage;
