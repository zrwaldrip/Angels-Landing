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

// ── Theme tokens (mirrors App.css custom properties) ─────────────────────────
const DARK_CARD   = 'rgba(37, 40, 58, 0.86)';
const DARK_BORDER = 'rgba(0, 113, 93, 0.30)';
const TEXT_MAIN   = 'rgba(242, 245, 252, 0.96)';
const TEXT_MUTED  = 'rgba(210, 218, 236, 0.86)';

// ── Colour palettes ───────────────────────────────────────────────────────────
const VERDICT_COLOURS: Record<string, string> = {
  'Moving the needle': '#198754',
  'Mixed results':     '#fd7e14',
  'Noise / baseline':  '#dc3545',
};

const CAMPAIGN_COLOURS = [
  '#4dabf7', '#74c0fc', '#a9e34b', '#ffd43b',
  '#ff8787', '#da77f2', '#38d9a9', '#ffa94d',
];

const CHANNEL_COLOURS = ['#4dabf7', '#da77f2', '#a9e34b', '#ffd43b', '#ff8787', '#38d9a9'];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
const NO_CAMPAIGN = 'No Campaign';

function pivotChannels(rows: CampaignChannelBreakdown[]) {
  const filtered = rows.filter(r => r.campaign !== NO_CAMPAIGN);
  const channels = [...new Set(filtered.map(r => r.channel))];
  const byCampaign: Record<string, Record<string, number>> = {};
  for (const row of filtered) {
    if (!byCampaign[row.campaign]) byCampaign[row.campaign] = {};
    byCampaign[row.campaign][row.channel] = row.totalValue ?? 0;
  }
  const data = Object.entries(byCampaign).map(([campaign, vals]) => ({
    campaign: campaign.length > 18 ? campaign.slice(0, 16) + '…' : campaign,
    ...vals,
  }));
  return { data, channels };
}

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

function buildHeatmapMatrix(rows: CampaignChannelBreakdown[]) {
  const filtered = rows.filter(r => r.campaign !== NO_CAMPAIGN);
  const campaigns = [...new Set(filtered.map(r => r.campaign))].sort();
  const channels  = [...new Set(filtered.map(r => r.channel))].sort();
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of filtered) {
    if (!matrix[row.campaign]) matrix[row.campaign] = {};
    matrix[row.campaign][row.channel] = row.totalValue ?? 0;
  }
  const maxVal = Math.max(...filtered.map(r => r.totalValue ?? 0), 1);
  return { campaigns, channels, matrix, maxVal };
}

// ── Sig. Lift tooltip ─────────────────────────────────────────────────────────
function SigLiftHeader() {
  const [visible, setVisible] = useState(false);
  return (
    <th style={{ position: 'relative', whiteSpace: 'nowrap' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          cursor: 'help',
          borderBottom: `1px dotted ${TEXT_MUTED}`,
          paddingBottom: 1,
        }}
      >
        Sig. Lift ⓘ
      </span>
      {visible && (
        <div style={{
          position:     'absolute',
          bottom:       'calc(100% + 8px)',
          right:        0,
          zIndex:       50,
          width:        300,
          background:   'rgba(20, 24, 38, 0.97)',
          border:       `1px solid ${DARK_BORDER}`,
          borderRadius: 8,
          padding:      '10px 14px',
          fontSize:     12,
          lineHeight:   1.55,
          color:        TEXT_MAIN,
          boxShadow:    '0 8px 28px rgba(0,0,0,0.55)',
          pointerEvents:'none',
        }}>
          <strong style={{ color: '#74c0fc' }}>Statistically Significant Lift</strong>
          <br />
          Based on Multiple Linear Regression (OLS). A campaign is marked{' '}
          <strong>Yes</strong> when its coefficient has a p-value &lt; 0.05 — meaning it
          drives measurably higher donation values compared to untagged donations,
          even after controlling for channel, donor type, and timing.
        </div>
      )}
    </th>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignAnalysisPage() {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [breakdown, setBreakdown]       = useState<CampaignChannelBreakdown[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<CampaignMonthlyTrend[]>([]);
  const [featureImps, setFeatureImps]   = useState<CampaignFeatureImportance[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);

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
            year: 'numeric', month: 'long', day: 'numeric',
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

  // Shared card style — matches the dark theme card from App.css
  const card: React.CSSProperties = {
    background:   DARK_CARD,
    border:       `1px solid ${DARK_BORDER}`,
    borderRadius: 8,
    padding:      '1.25rem',
    marginBottom: '1.25rem',
    color:        TEXT_MAIN,
  };

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
          <p className="mt-2" style={{ color: TEXT_MUTED }}>Loading campaign data…</p>
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
          <div style={{
            ...card,
            borderLeft: '4px solid #4dabf7',
            background: 'rgba(13, 110, 253, 0.10)',
          }}>
            <h5 className="fw-bold mb-3" style={{ color: '#74c0fc' }}>
              <i className="bi bi-lightbulb-fill me-2" />Staff Recommendations
            </h5>
            <ul className="mb-0" style={{ color: TEXT_MAIN, lineHeight: 1.7 }}>
              {topCampaign?.topChannel && (
                <li>
                  Run <strong>{topCampaign.campaignName}</strong> through{' '}
                  <strong>{topCampaign.topChannel}</strong> — historically your highest-value combination.
                </li>
              )}
              {topRecurringCampaign?.recurringRate != null && topRecurringCampaign.recurringRate > 0 && (
                <li>
                  <strong>{topRecurringCampaign.campaignName}</strong> generates your best recurring donor
                  rate ({(topRecurringCampaign.recurringRate * 100).toFixed(1)}%) — prioritize it to build
                  long-term support.
                </li>
              )}
              <li>
                Focus on campaigns marked <strong>"Moving the needle"</strong> — the pipeline confirms
                their lift is statistically significant versus baseline donations.
              </li>
            </ul>
          </div>

          {/* ── Summary cards ── */}
          <div className="row g-3 mb-4">
            {[
              {
                label: 'Top Campaign',
                value: <>{topCampaign?.campaignName ?? '—'}<br />{verdictBadge(topCampaign?.verdict)}</>,
              },
              {
                label: 'Total Raised',
                value: `₱${fmt(totalRaised)}`,
              },
              {
                label: 'Total Unique Donors',
                value: fmt(totalDonors),
              },
              {
                label: 'Campaigns Moving the Needle',
                value: <>{movingCount} <span style={{ fontSize: '0.9rem', color: TEXT_MUTED }}>of {campaigns.length}</span></>,
              },
            ].map(({ label, value }) => (
              <div key={label} className="col-sm-6 col-lg-3">
                <div style={{ ...card, marginBottom: 0 }}>
                  <p className="small mb-1" style={{ color: TEXT_MUTED }}>{label}</p>
                  <h5 className="fw-bold mb-0" style={{ color: TEXT_MAIN }}>{value}</h5>
                </div>
              </div>
            ))}
          </div>

          {/* ── Time-series line chart ── */}
          {trendData.length > 0 && (
            <div style={card}>
              <h5 className="fw-semibold mb-1" style={{ color: TEXT_MAIN }}>Monthly Donation Value by Campaign</h5>
              <p className="small mb-3" style={{ color: TEXT_MUTED }}>
                Total estimated value raised each month per campaign. Shows momentum and seasonality.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: TEXT_MUTED }} />
                  <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(20,24,38,0.97)', border: `1px solid ${DARK_BORDER}`, borderRadius: 6, color: TEXT_MAIN }}
                    formatter={(value, name) => {
                      const n = asFiniteNumber(value);
                      return [`₱${fmt(n)}`, name as string];
                    }}
                  />
                  <Legend wrapperStyle={{ color: TEXT_MAIN }} />
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
          )}

          {/* ── Channel × Campaign heatmap ── */}
          {heatCampaigns.length > 0 && heatChannels.length > 0 && (
            <div style={card}>
              <h5 className="fw-semibold mb-1" style={{ color: TEXT_MAIN }}>Channel × Campaign Heatmap</h5>
              <p className="small mb-3" style={{ color: TEXT_MUTED }}>
                Total estimated value per campaign + channel combination. Darker cells = higher value.
                Use this to decide <em>how</em> to run each campaign.
              </p>
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: TEXT_MUTED, borderBottom: `1px solid ${DARK_BORDER}`, fontWeight: 600 }}>
                        Campaign
                      </th>
                      {heatChannels.map(ch => (
                        <th key={ch} style={{ padding: '8px 12px', textAlign: 'center', color: TEXT_MUTED, borderBottom: `1px solid ${DARK_BORDER}`, fontWeight: 600 }}>
                          {ch}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatCampaigns.map((camp, ri) => (
                      <tr key={camp} style={{ borderBottom: ri < heatCampaigns.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: TEXT_MAIN, whiteSpace: 'nowrap' }}>
                          {camp}
                        </td>
                        {heatChannels.map(ch => {
                          const val       = heatMatrix[camp]?.[ch] ?? 0;
                          const intensity = heatMax > 0 ? val / heatMax : 0;
                          const bg        = intensity > 0.05
                            ? `rgba(77, 171, 247, ${0.12 + intensity * 0.72})`
                            : 'transparent';
                          return (
                            <td key={ch} style={{
                              padding:    '8px 12px',
                              textAlign:  'center',
                              background: bg,
                              color:      TEXT_MAIN,
                              minWidth:   90,
                              borderRadius: 4,
                            }}>
                              {val > 0
                                ? `₱${fmt(val)}`
                                : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Decision Tree Feature Importance ── */}
          {featureImps.length > 0 && (
            <div style={card}>
              <h5 className="fw-semibold mb-1" style={{ color: TEXT_MAIN }}>What Drives Donation Value? (Decision Tree)</h5>
              <p className="small mb-3" style={{ color: TEXT_MUTED }}>
                Feature importances from the model in <code style={{ color: '#74c0fc' }}>campaign_effectiveness_model.pkl</code>.
                Higher = that factor explains more of the variation in donation value.
              </p>
              <ResponsiveContainer width="100%" height={Math.max(180, featureImps.length * 44)}>
                <BarChart
                  layout="vertical"
                  data={featureImps.map(f => ({ name: f.feature, importance: +f.importance.toFixed(4) }))}
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    type="number"
                    domain={[0, 1]}
                    tick={{ fontSize: 11, fill: TEXT_MUTED }}
                    tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: TEXT_MAIN }} width={160} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(20,24,38,0.97)', border: `1px solid ${DARK_BORDER}`, borderRadius: 6, color: TEXT_MAIN }}
                    formatter={(value) => {
                      const n = asFiniteNumber(value);
                      return [n != null ? `${(n * 100).toFixed(1)}%` : '—', 'Importance'];
                    }}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]} fill="#4dabf7" />
                </BarChart>
              </ResponsiveContainer>
              {featureImps[0] && (
                <p className="small mt-2 mb-0" style={{ color: TEXT_MUTED }}>
                  <strong style={{ color: TEXT_MAIN }}>{featureImps[0].feature}</strong> is the single
                  most influential factor, explaining{' '}
                  {(featureImps[0].importance * 100).toFixed(1)}% of donation value variance.
                  {featureImps[1] && (
                    <> <strong style={{ color: TEXT_MAIN }}>{featureImps[1].feature}</strong> accounts
                    for another {(featureImps[1].importance * 100).toFixed(1)}%.</>
                  )}
                </p>
              )}
            </div>
          )}

          {/* ── Channel Effectiveness stacked bar ── */}
          {channelData.length > 0 && (
            <div style={card}>
              <h5 className="fw-semibold mb-1" style={{ color: TEXT_MAIN }}>Channel Effectiveness by Campaign</h5>
              <p className="small mb-3" style={{ color: TEXT_MUTED }}>
                Total estimated value raised per channel, broken down by campaign.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="campaign" tick={{ fontSize: 12, fill: TEXT_MUTED }} />
                  <YAxis tick={{ fontSize: 12, fill: TEXT_MUTED }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(20,24,38,0.97)', border: `1px solid ${DARK_BORDER}`, borderRadius: 6, color: TEXT_MAIN }}
                    formatter={(value) => {
                      const n = asFiniteNumber(value);
                      return [`₱${fmt(n)}`, ''];
                    }}
                  />
                  <Legend wrapperStyle={{ color: TEXT_MAIN }} />
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
          )}

          {/* ── Campaign Leaderboard ── */}
          <div style={card}>
            <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
              <h5 className="fw-semibold mb-0" style={{ color: TEXT_MAIN }}>Campaign Leaderboard</h5>

              {/* Composite score formula callout */}
              <div style={{
                background:   'rgba(77, 171, 247, 0.10)',
                border:       '1px solid rgba(77, 171, 247, 0.30)',
                borderRadius: 8,
                padding:      '10px 14px',
                maxWidth:     330,
                fontSize:     13,
              }}>
                <div className="fw-semibold mb-1" style={{ color: '#74c0fc' }}>How scores are calculated</div>
                <div style={{ color: TEXT_MUTED, lineHeight: 1.55 }}>
                  Score = <strong style={{ color: TEXT_MAIN }}>50%</strong> percentile rank by total value
                  &nbsp;+&nbsp;<strong style={{ color: TEXT_MAIN }}>50%</strong> percentile rank by donor count
                </div>
                <div className="mt-2" style={{ fontSize: 12 }}>
                  {Object.entries(VERDICT_COLOURS).map(([label, colour]) => (
                    <div key={label} className="d-flex align-items-center gap-2 mb-1">
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: colour, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ color: TEXT_MUTED }}>
                        <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>
                          {label === 'Moving the needle' ? '> 0.6' :
                           label === 'Mixed results'     ? '0.3 – 0.6' : '≤ 0.3'}
                        </span>
                        {' '}{label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: TEXT_MAIN }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${DARK_BORDER}` }}>
                    {['#', 'Campaign', 'Total Value', 'Donors', 'Avg Donation', 'Recurring Rate', 'Score', 'Verdict'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', color: TEXT_MUTED, fontWeight: 600, textAlign: h === '#' || h === 'Campaign' || h === 'Verdict' ? 'left' : 'right' }}>
                        {h}
                      </th>
                    ))}
                    <SigLiftHeader />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr
                      key={c.campaignId}
                      style={{
                        borderBottom: i < campaigns.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 113, 93, 0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: TEXT_MUTED, fontWeight: 600 }}>{c.rank}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.campaignName}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>₱{fmt(c.totalValue)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmt(c.donorCount)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>₱{fmt(c.meanValue, 2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {c.recurringRate != null ? `${(c.recurringRate * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {(c.compositeScore ?? 0).toFixed(3)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{verdictBadge(c.verdict)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {c.mlrSignificant
                          ? <span className="badge bg-primary">Yes</span>
                          : <span style={{ color: TEXT_MUTED, fontSize: 13 }}>No</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
