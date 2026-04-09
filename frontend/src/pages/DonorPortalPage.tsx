import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { convertCurrency, createMyDonation, getMyDonations, type Donation } from '../lib/lighthouseAPI';

const CAMPAIGN_OPTIONS = ['', 'Year-End Hope', 'GivingTuesday', 'Summer of Safety', 'Back to School'] as const;

function DonorPortalPage() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donating, setDonating] = useState(false);
  const [donateError, setDonateError] = useState('');
  const [fxPreview, setFxPreview] = useState('');
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState('');
  const [donationForm, setDonationForm] = useState({
    amount: '',
    currencyCode: 'PHP',
    campaignName: '',
    isRecurring: false,
    notes: '',
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) void loadMyDonations();
  }, [isAuthenticated, isLoading, page]);

  useEffect(() => {
    if (searchParams.get('donate') === '1') {
      setShowDonateModal(true);
      setDonateError('');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('donate');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function loadMyDonations() {
    setLoading(true);
    setError('');
    try {
      const result = await getMyDonations({ page, pageSize });
      setDonations(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your donations.');
    } finally {
      setLoading(false);
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="container mt-4">
        <Header />
        <div className="alert alert-warning">Please <Link to="/login">sign in</Link> to view your donor portal.</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  function openDonateModal() {
    setDonateError('');
    setFxError('');
    setShowDonateModal(true);
  }

  useEffect(() => {
    const amountText = donationForm.amount.trim();
    const amount = amountText ? Number(amountText) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      setFxPreview('');
      setFxError('');
      setFxLoading(false);
      return;
    }

    const from = donationForm.currencyCode as 'USD' | 'PHP';
    const to: 'USD' | 'PHP' = from === 'USD' ? 'PHP' : 'USD';
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      setFxLoading(true);
      setFxError('');
      try {
        const conversion = await convertCurrency(from, to, amount);
        if (cancelled) return;

        setFxPreview(
          `${amount.toFixed(2)} ${from} ≈ ${conversion.convertedAmount.toFixed(2)} ${to} ` +
          `(1 ${from} = ${conversion.rate.toFixed(4)} ${to}, ${conversion.asOfDate})`
        );
      } catch (error) {
        if (cancelled) return;
        setFxPreview('');
        setFxError(error instanceof Error ? error.message : 'Unable to fetch live conversion right now.');
      } finally {
        if (!cancelled) setFxLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [donationForm.amount, donationForm.currencyCode]);

  useEffect(() => {
    if (!fxError) return;
    const timeoutId = setTimeout(() => setFxError(''), 5000);
    return () => clearTimeout(timeoutId);
  }, [fxError]);

  useEffect(() => {
    if (!donateError) return;
    const timeoutId = setTimeout(() => setDonateError(''), 6000);
    return () => clearTimeout(timeoutId);
  }, [donateError]);

  async function handleSubmitDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDonating(true);
    setDonateError('');

    const amountText = donationForm.amount.trim();
    const amount = amountText ? Number(amountText) : undefined;
    if (amountText && Number.isNaN(amount)) {
      setDonateError('Amount must be a valid number.');
      setDonating(false);
      return;
    }

    if (amount == null || amount <= 0) {
      setDonateError('Amount must be greater than zero.');
      setDonating(false);
      return;
    }

    try {
      await createMyDonation({
        amount,
        currencyCode: donationForm.currencyCode,
        campaignName: donationForm.campaignName || undefined,
        isRecurring: donationForm.isRecurring,
        notes: donationForm.notes || undefined,
      });

      setShowDonateModal(false);
      setDonationForm({
        amount: '',
        currencyCode: 'PHP',
        campaignName: '',
        isRecurring: false,
        notes: '',
      });
      await loadMyDonations();
    } catch (e) {
      setDonateError(e instanceof Error ? e.message : 'Failed to create donation.');
    } finally {
      setDonating(false);
    }
  }

  return (
    <div className="container mt-4 donor-portal-page">
      <Header />
      <div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
        <h2 className="h4 mb-0">Donor Portal</h2>
        <div className="mobile-page-actions">
          <button className="btn donor-portal-donate-btn" onClick={openDonateModal}>Donate Now</button>
        </div>
      </div>

      <p className="text-muted">This page shows donations associated with your supporter profile.</p>

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Donation ID</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Campaign</th>
                  <th>Recurring</th>
                </tr>
              </thead>
              <tbody>
                {donations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">No donations found for your account.</td>
                  </tr>
                ) : (
                  donations.map((d) => (
                    <tr key={d.donationId}>
                      <td>{d.donationId}</td>
                      <td>{d.donationDate}</td>
                      <td>{d.donationType}</td>
                      <td>{d.amount != null ? d.amount.toFixed(2) : d.estimatedValue?.toFixed(2)}</td>
                      <td>{d.currencyCode}</td>
                      <td>{d.campaignName}</td>
                      <td>{d.isRecurring ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">{total} donations total</small>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="btn btn-sm disabled">Page {page} of {Math.max(1, totalPages)}</span>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showDonateModal ? (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmitDonation}>
                <div className="modal-header">
                  <h5 className="modal-title">Post a Donation</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDonateModal(false)} />
                </div>
                <div className="modal-body">
                  {donateError ? <div className="alert alert-danger">{donateError}</div> : null}
                  <div className="alert alert-info py-2 px-3 small">
                    This donor form records money donations only. Non-cash contributions are tracked by staff through the admin workflow.
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Donation Amount</label>
                    <div className="row g-2">
                      <div className="col-8">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          placeholder="e.g. 1500"
                          value={donationForm.amount}
                          onChange={(e) => setDonationForm((prev) => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      <div className="col-4">
                        <select
                          className="form-select"
                          value={donationForm.currencyCode}
                          onChange={(e) => setDonationForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                        >
                          <option value="PHP">PHP</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-text">You can donate in PHP or USD.</div>
                    {fxLoading ? <div className="form-text">Fetching live conversion...</div> : null}
                    {fxPreview ? <div className="form-text">{fxPreview}</div> : null}
                    {fxError ? <div className="text-danger small">{fxError}</div> : null}
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Campaign (optional)</label>
                    <select
                      className="form-control"
                      value={donationForm.campaignName}
                      onChange={(e) => setDonationForm((prev) => ({ ...prev, campaignName: e.target.value }))}
                    >
                      {CAMPAIGN_OPTIONS.map((option) => (
                        <option key={option || 'none'} value={option}>
                          {option || 'No campaign'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-check mb-2">
                    <input
                      id="isRecurring"
                      type="checkbox"
                      className="form-check-input"
                      checked={donationForm.isRecurring}
                      onChange={(e) => setDonationForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
                    />
                    <label htmlFor="isRecurring" className="form-check-label">Recurring donation</label>
                    <div className="form-text">Check this if this gift repeats over time.</div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={donationForm.notes}
                      onChange={(e) => setDonationForm((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDonateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={donating}>
                    {donating ? 'Posting...' : 'Post Donation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DonorPortalPage;
