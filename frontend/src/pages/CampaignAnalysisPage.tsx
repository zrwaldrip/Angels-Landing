import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';
import Header from '../components/Header';
import {
  getCampaigns, getCampaignChannelBreakdown,
  getCampaignMonthlyTrend, getCampaignFeatureImportance,
  type Campaign, type CampaignChannelBreakdown,
  type CampaignMonthlyTrend, type CampaignFeatureImportance,
} from '../lib/lighthouseAPI';

// ── Colour helpers ────────────────────────────────────────────────────────────
const VERDICT_COLOURS: Record<string, string> = {
  'Moving the needle': '#198754',
  'Mixed results':     '#fd7e14',
  'Noise / baseline':  '#dc3545',
};

const CAMPAIGN_COLOURS = [
  '#0d6efd', '#6610f2', '#20c997', '#ffc107',
  '#0dcaf0', '#d63384', '#fd7e14', '#198754',
];

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

// ── Data pivot helpers ────────────────────────────────────────────────────────

// Transforms flat breakdown rows into recharts-friendly stacked bar objects keyed by campaign
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

// Pivots flat monthly trend rows into recharts LineChart format
function pivotTimeSeries(rows: CampaignMonthlyTrend[]) {
  const campaigns = [...new Set(rows.map(r => r.campaign))].sort();
  const byMonth: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byMonth[row.month]) byMonth[row.month] = {};
    byMonth[row.month][row.campaign] = row.totalValue;
  }
  const data = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, ...vals }));
  return { data, campaigns };
}

// Builds campaign × channel matrix for heatmap
function buildHeatmapMatrix(rows: CampaignChannelBreakdown[]) {
  const campaigns = [...new Set(rows.map(r => r.campaign))].sort();
  const channels  = [...new Set(rows.map(r => r.channel))].sort();
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!matrix[row.campaign]) matrix[row.campaign] = {};
    matrix[row.campaign][row.channel] = row.totalValue ?? 0;
  }
  const maxVal = Math.max(...rows.map(r => r.totalValue ?? 0), 1);
  return { campaigns, channels, matrix, maxVal };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignAnalysisPage() {
  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [breakdown, setBreakdown]           = useState<CampaignChannelBreakdown[]>([]);
  const [monthlyTrend, setMonthlyTrend]     = useState<CampaignMonthlyTrend[]>([]);
  const [featureImps, setFeatureImps]       = useState<CampaignFeatureImportance[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]       = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCampaigns(),
      getCampaignChannelBreakdown(),
      getCampaignMonthlyTrend(),
      getCampaignFeatureImportance(),
    ])
      .then(([camps, bd, trend, imps]) => {
        setCampaigns(camps);
        setBreakdown(bd);
        setMonthlyTrend(trend);
        setFeatureImps(imps);
        if (camps.length > 0 && camps[0].mlLastCalculated) {
          setLastUpdated(new Date(camps[0].mlLastCalculated).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric'
          }));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { data: channelData, channels }                = pivotChannels(breakdown);
  const { data: trendData, campaigns: trendCampaigns } = pivotTimeSeries(monthlyTrend);
  const { campaigns: heatCampaigns, channels: heatChannels, matrix: heatMatrix, maxVal: heatMax }
    = buildHeatmapMatrix(breakdown);

  const topCampaign          = campaigns[0];
  const topRecurringCampaign = [...campaigns].sort((a, b) => (b.recurringRate || 0) - (a.recurringRate || 0))[0];
  const totalRaised          = campaigns.reduce((s, c) => s + (c.totalValue ?? 0), 0);
  const totalDonors          = campaigns.reduce((s, c) => s + (c.donorCount ?? 0), 0);
  const movingCount          = campaigns.filter(c => c.verdict === 'Moving the needle').length;

  return (
    <div className="container-fluid">
      <Header />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Campaign Analysis</h2>
          <p className="text-muted mb-0 small">
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
                  Focus on campaigns marked as <strong>"Moving the needle"</strong> — our pipeline confirms their lift is statistically significant versus baseline donations.
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

          {/* ── Time-series line chart ── */}
          {trendData.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-semibold mb-1">Monthly Donation Value by Campaign</h5>
                <p className="text-muted small mb-3">
                  Total estimated value raised each month, broken down by campaign. Shows momentum and seasonality.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value, name) => {
                        const n = asFiniteNumber(value);
                        return [`₱${fmt(n)}`, name as string];
                      }}
                    />
                    <Legend />
                    {trendCampaigns.map((camp, i) => (
                      <Line
                        key={camp}
                        type="monotone"
                        dataKey={camp}
                        stroke={CAMPAIGN_COLOURS[i % CAMPAIGN_COLOURS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Channel × Campaign heatmap ── */}
          {heatCampaigns.length > 0 && heatChannels.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-semibold mb-1">Channel × Campaign Heatmap</h5>
                <p className="text-muted small mb-3">
                  Total estimated value per campaign + channel combination. Darker cells = higher value.
                  Use this to decide <em>how</em> to run each campaign.
                </p>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold">Campaign</th>
                        {heatChannels.map(ch => (
                          <th key={ch} className="text-center fw-semibold">{ch}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatCampaigns.map(camp => (
                        <tr key={camp}>
                          <td className="fw-semibold text-nowrap">{camp}</td>
                          {heatChannels.map(ch => {
                            const val = heatMatrix[camp]?.[ch] ?? 0;
                            const intensity = heatMax > 0 ? val / heatMax : 0;
                            const bg = `rgba(13, 110, 253, ${0.05 + intensity * 0.75})`;
                            const textColour = intensity > 0.55 ? '#fff' : '#212529';
                            return (
                              <td
                                key={ch}
                                className="text-center"
                                style={{ background: bg, color: textColour, minWidth: 90 }}
                              >
                                {val > 0 ? `₱${fmt(val)}` : <span className="text-muted">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Decision Tree Feature Importance ── */}
          {featureImps.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <h5 className="card-title fw-semibold mb-1">What Drives Donation Value? (Decision Tree)</h5>
                <p className="text-muted small mb-3">
                  Feature importances from a decision tree trained on individual donations.
                  Higher = that factor explains more of the variation in donation value.
                  This mirrors the analysis in <code>campaign_analysis.ipynb</code>.
                </p>
                <ResponsiveContainer width="100%" height={Math.max(180, featureImps.length * 44)}>
                  <BarChart
                    layout="vertical"
                    data={featureImps.map(f => ({
                      name: f.feature,
                      importance: +f.importance.toFixed(4),
                    }))}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={160} />
                    <Tooltip
                      formatter={(value) => {
                        const n = asFiniteNumber(value);
                        return [n != null ? `${(n * 100).toFixed(1)}%` : '—', 'Importance'];
                      }}
                    />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]} fill="#0d6efd" />
                  </BarChart>
                </ResponsiveContainer>
                {featureImps[0] && (
                  <p className="text-muted small mt-2 mb-0">
                    <strong>{featureImps[0].feature}</strong> is the single most influential factor,
                    explaining {(featureImps[0].importance * 100).toFixed(1)}% of donation value variance.
                    {featureImps[1] && (
                      <> <strong>{featureImps[1].feature}</strong> accounts for another {(featureImps[1].importance * 100).toFixed(1)}%.</>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Channel breakdown stacked bar ── */}
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

          {/* ── Campaign Leaderboard ── */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <h5 className="card-title fw-semibold mb-0">Campaign Leaderboard</h5>
                {/* Composite score formula callout */}
                <div
                  className="rounded px-3 py-2 small"
                  style={{ background: '#f0f4ff', border: '1px solid #c7d8ff', maxWidth: 320 }}
                >
                  <span className="fw-semibold text-primary">How scores are calculated</span>
                  <div className="mt-1 text-muted" style={{ lineHeight: 1.5 }}>
                    Score = <strong>50%</strong> percentile rank by total value
                    &nbsp;+&nbsp;<strong>50%</strong> percentile rank by donor count
                  </div>
                  <div className="mt-1" style={{ fontSize: '0.8rem' }}>
                    {Object.entries(VERDICT_COLOURS).map(([label, colour]) => (
                      <span key={label} className="me-2 d-inline-flex align-items-center gap-1">
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: colour, display: 'inline-block' }} />
                        {label === 'Moving the needle' ? '> 0.6' :
                         label === 'Mixed results'     ? '0.3 – 0.6' : '≤ 0.3'}
                        &nbsp;<span className="text-muted">{label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

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
                      <th>
                        <abbr
                          title="Statistically significant lift based on Multiple Linear Regression (OLS). A campaign is marked 'Yes' when its p-value < 0.05, meaning it drives measurably higher donation values compared to untagged donations after controlling for channel, donor type, and timing."
                          style={{ cursor: 'help', textDecoration: 'underline dotted' }}
                        >
                          Sig. Lift
                        </abbr>
                      </th>
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
                          {c.mlrSignificant
                            ? <span className="badge bg-primary">Yes</span>
                            : <span className="text-muted small">No</span>
                          }
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
