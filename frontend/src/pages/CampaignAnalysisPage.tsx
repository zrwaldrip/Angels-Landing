import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import Header from '../components/Header';
import {
  getCampaigns, getCampaignChannelBreakdown,
  type Campaign, type CampaignChannelBreakdown
} from '../lib/lighthouseAPI';

// ── Colour helpers ────────────────────────────────────────────────────────────
const VERDICT_COLOURS: Record<string, string> = {
  'Moving the needle': '#198754',
  'Mixed results':     '#fd7e14',
  'Noise / baseline':  '#dc3545',
};

const CHANNEL_COLOURS = ['#0d6efd', '#6610f2', '#20c997', '#ffc107', '#0dcaf0', '#d63384'];

function verdictBadge(verdict?: string) {
  if (!verdict) return null;
  const colour =
    verdict === 'Moving the needle' ? 'success' :
    verdict === 'Mixed results'     ? 'warning'  : 'danger';
  return <span className={`badge bg-${colour}`}>{verdict}</span>;
}

function fmt(n?: number, decimals = 0) {
  if (n == null) return '—';
  return n.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// ── Channel pivot helper ──────────────────────────────────────────────────────
// Transforms flat breakdown rows into recharts-friendly objects keyed by campaign
function pivotChannels(rows: CampaignChannelBreakdown[]) {
  const channels = [...new Set(rows.map(r => r.channel))];
  const byCampaign: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byCampaign[row.campaign]) byCampaign[row.campaign] = {};
    byCampaign[row.campaign][row.channel] = row.totalValue ?? 0;
  }
  const data = Object.entries(byCampaign).map(([campaign, vals]) => ({
    campaign: campaign.length > 18 ? campaign.slice(0, 16) + '…' : campaign,
    ...vals,
  }));
  return { data, channels };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignAnalysisPage() {
  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [breakdown, setBreakdown]           = useState<CampaignChannelBreakdown[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCampaigns(), getCampaignChannelBreakdown()])
      .then(([camps, bd]) => {
        setCampaigns(camps);
        setBreakdown(bd);
        if (camps.length > 0 && camps[0].mlLastCalculated) {
          setLastUpdated(new Date(camps[0].mlLastCalculated).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric'
          }));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { data: channelData, channels } = pivotChannels(breakdown);

  const topCampaign   = campaigns[0];
  const topRecurringCampaign = [...campaigns].sort((a,b) => (b.recurringRate || 0) - (a.recurringRate || 0))[0];
  const totalRaised   = campaigns.reduce((s, c) => s + (c.totalValue ?? 0), 0);
  const totalDonors   = campaigns.reduce((s, c) => s + (c.donorCount ?? 0), 0);
  const movingCount   = campaigns.filter(c => c.verdict === 'Moving the needle').length;

  return (
    <div className="container-fluid campaign-analysis-page">
      <Header />

      <div className="d-flex justify-content-between align-items-center mb-4 mobile-page-header">
        <div>
          <h2 className="fw-bold mb-0">Campaign Analysis</h2>
          <p className="text-muted mb-0 small mobile-page-subtitle">
            ML-scored fundraising effectiveness &mdash; updated weekly by the campaign scorer pipeline
            {lastUpdated && <> &middot; Last scored: {lastUpdated}</>}
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">Loading campaign data…</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          Failed to load campaigns: {error}
          {campaigns.length === 0 && (
            <div className="mt-2 small">
              The Campaigns table may be empty. Run <code>campaign_scorer.py</code> or trigger
              the GitHub Actions workflow to populate it.
            </div>
          )}
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && (
        <div className="alert alert-info">
          No campaign data yet. Trigger the <strong>Weekly Campaign Scorer</strong> workflow
          in GitHub Actions to populate this page.
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <>
          {/* ── Staff Recommendations ── */}
          <div className="card border-0 shadow-sm mb-4 border-start border-primary border-4 bg-light">
            <div className="card-body">
              <h5 className="card-title fw-bold text-primary mb-3">
                <i className="bi bi-lightbulb-fill me-2"></i>Staff Recommendations
              </h5>
              <ul className="mb-0">
                {topCampaign?.topChannel && (
                  <li>
                    Run <strong>{topCampaign.campaignName}</strong> through <strong>{topCampaign.topChannel}</strong> — that's historically your highest-value combination.
                  </li>
                )}
                {topRecurringCampaign?.recurringRate != null && topRecurringCampaign.recurringRate > 0 && (
                  <li className="mt-2">
                    <strong>{topRecurringCampaign.campaignName}</strong> generates your best recurring donor rate ({(topRecurringCampaign.recurringRate * 100).toFixed(1)}%) — prioritize it to build long-term support.
                  </li>
                )}
                <li className="mt-2">
                  Focus on strategies marked as <strong>"Moving the needle"</strong> — our pipeline confirms their lift is statistically significant versus baseline donations.
                </li>
              </ul>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-lg-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Top Campaign</p>
                  <h5 className="fw-bold mb-1">{topCampaign?.campaignName ?? '—'}</h5>
                  {verdictBadge(topCampaign?.verdict)}
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Total Raised Across All Campaigns</p>
                  <h5 className="fw-bold">₱{fmt(totalRaised)}</h5>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Total Unique Donors</p>
                  <h5 className="fw-bold">{fmt(totalDonors)}</h5>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <p className="text-muted small mb-1">Campaigns Moving the Needle</p>
                  <h5 className="fw-bold">{movingCount} <span className="fs-6 text-muted">of {campaigns.length}</span></h5>
                </div>
              </div>
            </div>
          </div>

          {/* ── Composite score bar chart ── */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-1">Campaign Composite Score</h5>
              <p className="text-muted small mb-3">
                Score = 50% normalised donation value + 50% normalised donor count. Range 0–1.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={campaigns.map(c => ({
                  name: (c.campaignName ?? '').length > 16
                    ? (c.campaignName ?? '').slice(0, 14) + '…'
                    : (c.campaignName ?? ''),
                  score: +(c.compositeScore ?? 0).toFixed(3),
                  verdict: c.verdict,
                }))} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => {
                      const n = asFiniteNumber(value);
                      return [n != null ? n.toFixed(3) : '—', 'Composite Score'];
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {campaigns.map((c) => (
                      <Cell
                        key={c.campaignId}
                        fill={VERDICT_COLOURS[c.verdict ?? ''] ?? '#6c757d'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="d-flex gap-3 mt-2 small">
                {Object.entries(VERDICT_COLOURS).map(([label, colour]) => (
                  <span key={label} className="d-flex align-items-center gap-1">
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: colour, display: 'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Channel breakdown chart ── */}
          {channelData.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-semibold mb-1">Channel Effectiveness by Campaign</h5>
                <p className="text-muted small mb-3">
                  Total estimated value raised per channel, broken down by campaign.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="campaign" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value) => {
                        const n = asFiniteNumber(value);
                        return [`₱${fmt(n)}`, ''];
                      }}
                    />
                    <Legend />
                    {channels.map((ch, i) => (
                      <Bar
                        key={ch}
                        dataKey={ch}
                        stackId="a"
                        fill={CHANNEL_COLOURS[i % CHANNEL_COLOURS.length]}
                        radius={i === channels.length - 1 ? [4, 4, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Leaderboard table ── */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title fw-semibold mb-3">Campaign Leaderboard</h5>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Campaign</th>
                      <th className="text-end">Total Value</th>
                      <th className="text-end">Donors</th>
                      <th className="text-end">Avg Donation</th>
                      <th className="text-end">Recurring Rate</th>
                      <th className="text-end">Score</th>
                      <th>Verdict</th>
                      <th>Sig. Lift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.campaignId}>
                        <td className="text-muted fw-semibold">{c.rank}</td>
                        <td className="fw-semibold">{c.campaignName}</td>
                        <td className="text-end">₱{fmt(c.totalValue)}</td>
                        <td className="text-end">{fmt(c.donorCount)}</td>
                        <td className="text-end">₱{fmt(c.meanValue, 2)}</td>
                        <td className="text-end">
                          {c.recurringRate != null ? `${(c.recurringRate * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="text-end">
                          <span className="fw-semibold">{(c.compositeScore ?? 0).toFixed(3)}</span>
                        </td>
                        <td>{verdictBadge(c.verdict)}</td>
                        <td>
                          {c.mlrSignificant ? <span className="badge bg-primary">Yes</span> : <span className="text-muted small">No</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
