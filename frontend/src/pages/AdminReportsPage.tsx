import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import {
  getAdminReportsSummary,
  getSocialEngagementInsights,
  type AdminReportsSummary,
  type SocialEngagementFactor,
  type SocialEngagementInsights
} from '../lib/lighthouseAPI';

function normalizeMonthKey(dateText: string | undefined) {
  if (!dateText) return null;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function progressVariant(percent: number) {
  if (percent >= 80) return 'bg-success';
  if (percent >= 60) return 'bg-info';
  if (percent >= 40) return 'bg-warning';
  return 'bg-danger';
}

/** Statistical confidence tier from p-value (explanatory model only). */
function factorConfidenceTier(pValue: number | undefined | null): string {
  if (pValue == null || Number.isNaN(pValue)) return '—';
  if (pValue < 0.01) return 'Strong';
  if (pValue < 0.05) return 'Moderate';
  return 'Weak / uncertain';
}

const SOCIAL_FACTOR_TOP_N = 10;

function SocialEngagementFactorList({
  factors,
  minP
}: {
  factors: SocialEngagementFactor[];
  minP?: number;
}) {
  const rows = useMemo(() => {
    const list = (factors ?? [])
      .filter((f) => f.coefficient != null && !Number.isNaN(f.coefficient))
      .slice()
      .sort((a, b) => Math.abs((b.coefficient as number) ?? 0) - Math.abs((a.coefficient as number) ?? 0));
    return list.slice(0, SOCIAL_FACTOR_TOP_N);
  }, [factors]);

  if (rows.length === 0) {
    return (
      <p className="text-muted small mb-0">
        No statistically significant patterns were found in this snapshot{minP != null ? ` (p < ${minP}).` : '.'}
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Pattern</th>
            <th style={{ width: 160 }}>Direction</th>
            <th style={{ width: 170 }}>Confidence</th>
            <th className="text-end small text-muted">Model detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const coef = f.coefficient ?? null;
            const direction = coef == null ? null : coef > 0 ? 'Higher' : 'Lower';
            const directionBadge = direction === 'Higher'
              ? 'text-bg-success'
              : direction === 'Lower'
                ? 'text-bg-danger'
                : 'text-bg-secondary';
            const tier = factorConfidenceTier(f.pValue ?? null);
            return (
              <tr key={`${f.rankOrder ?? ''}-${f.factorKey ?? ''}-${String(f.coefficient)}`}>
                <td>{f.displayName ?? f.factorKey ?? '—'}</td>
                <td>
                  <span className={`badge ${directionBadge}`}>{direction ?? '—'}</span>
                </td>
                <td>
                  <span className="small">{tier}</span>
                  {minP != null ? <span className="text-muted small"> (p &lt; {minP})</span> : null}
                </td>
                <td className="text-end small text-muted text-nowrap">
                  coef {coef != null ? coef.toFixed(4) : '—'}, p {f.pValue != null ? f.pValue.toFixed(4) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<AdminReportsSummary | null>(null);
  const [social, setSocial] = useState<SocialEngagementInsights | null>(null);
  const [socialError, setSocialError] = useState('');
  const [hoveredTrendPointIndex, setHoveredTrendPointIndex] = useState<number | null>(null);

  useEffect(() => {
    void loadReportsData();
  }, []);

  async function loadReportsData() {
    setLoading(true);
    setError('');
    setSocialError('');
    try {
      const reportSummary = await getAdminReportsSummary();
      setSummary(reportSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics reports.');
    }
    try {
      const socialInsights = await getSocialEngagementInsights();
      setSocial(socialInsights);
    } catch (e) {
      setSocial(null);
      setSocialError(e instanceof Error ? e.message : 'Social engagement insights unavailable.');
    } finally {
      setLoading(false);
    }
  }

  const donationTrendRows = useMemo(() => {
    return (summary?.donationTrends ?? [])
      .map((row) => {
        const monthKey = normalizeMonthKey(row.month) ?? row.month;
        return { month: monthKey, label: monthLabel(monthKey), totalValue: row.totalValue ?? 0 };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [summary]);

  const donationTrendMax = useMemo(
    () => Math.max(1, ...donationTrendRows.map((row) => row.totalValue)),
    [donationTrendRows]
  );

  const donationTrendChart = useMemo(() => {
    const width = 760;
    const height = 240;
    const left = 56;
    const right = 16;
    const top = 14;
    const bottom = 36;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    if (donationTrendRows.length === 0) {
      return { width, height, left, right, top, bottom, plotWidth, plotHeight, points: [], path: '', areaPath: '' };
    }

    const denominator = Math.max(1, donationTrendRows.length - 1);
    const points = donationTrendRows.map((row, index) => {
      const x = left + (index / denominator) * plotWidth;
      const y = top + (1 - row.totalValue / donationTrendMax) * plotHeight;
      return { ...row, x, y };
    });

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
    const areaPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${(top + plotHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(top + plotHeight).toFixed(2)} Z`;

    return { width, height, left, right, top, bottom, plotWidth, plotHeight, points, path, areaPath };
  }, [donationTrendMax, donationTrendRows]);

  const hoveredTrendPoint = hoveredTrendPointIndex != null
    ? donationTrendChart.points[hoveredTrendPointIndex] ?? null
    : null;

  const residentOutcomeMetrics = useMemo(() => {
    return summary?.residentOutcomeMetrics ?? { avgEducationProgress: 0, avgHealthScore: 0, healthImprovementRate: 0 };
  }, [summary]);

  const safehouseComparisonRows = useMemo(() => {
    return (summary?.safehouseComparison ?? []).sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [summary]);

  const reintegrationReport = useMemo(() => {
    return summary?.reintegration ?? { assessed: 0, successful: 0, successRate: 0 };
  }, [summary]);

  const annualAccomplishment = useMemo(() => {
    return summary?.annualAccomplishment ?? {
      serviceCounts: { caring: 0, healing: 0, teaching: 0 },
      beneficiaries: { caring: 0, healing: 0, teaching: 0, totalBeneficiaries: 0 },
      outcomes: { activeCases: 0, avgEducation: 0, reintegrationRate: 0 }
    };
  }, [summary]);

  const reportPeriodText = useMemo(() => {
    const start = summary?.reportPeriod?.startUtc ? new Date(summary.reportPeriod.startUtc) : null;
    const end = summary?.reportPeriod?.endUtc ? new Date(summary.reportPeriod.endUtc) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return null;
    const fmt: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, fmt)} – ${end.toLocaleDateString(undefined, fmt)}`;
  }, [summary?.reportPeriod?.endUtc, summary?.reportPeriod?.startUtc]);

  return (
    <div className="container mt-2 admin-reports-page">
      <Header />
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 mobile-page-header">
            <h2 className="h4 mb-0">Reports &amp; Analytics</h2>
            <div className="mobile-page-actions">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadReportsData()} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh data'}
              </button>
            </div>
          </div>
          <p className="text-muted mb-4 mobile-page-subtitle">
            Aggregated insights for donation trends, resident outcomes, safehouse performance, and reintegration success,
            aligned with annual accomplishment reporting structures used by social welfare agencies.
          </p>
          {reportPeriodText ? (
            <div className="small text-muted mb-3">
              <div>
                Reporting window (rolling 12 months): <strong>{reportPeriodText}</strong>
              </div>
              {(summary?.methodologyNotes ?? []).length > 0 ? (
                <details className="mt-2">
                  <summary className="text-muted" style={{ cursor: 'pointer' }}>
                    Methodology notes
                  </summary>
                  <ul className="mt-2 mb-0 ps-3">
                    {(summary?.methodologyNotes ?? []).map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}

          {error ? <div className="alert alert-danger">{error}</div> : null}
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border text-primary" role="status" /></div>
          ) : (
            <>
              <div className="row g-3 mb-4">
                <div className="col-lg-6">
                  <div className="border rounded p-3 h-100">
                    <h4 className="h6 mb-3">Donation Trends Over Time (12 months)</h4>
                    {donationTrendRows.length === 0 ? (
                      <p className="text-muted small mb-0">No donation trend data available.</p>
                    ) : (
                      <div className="w-100 position-relative" role="img" aria-label="Line chart showing monthly donation totals for the last 12 months">
                        <svg viewBox={`0 0 ${donationTrendChart.width} ${donationTrendChart.height}`} className="w-100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="donationTrendArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>

                          {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                            const y = donationTrendChart.top + step * donationTrendChart.plotHeight;
                            const value = Math.round((1 - step) * donationTrendMax);
                            return (
                              <g key={`grid-${step}`}>
                                <line
                                  x1={donationTrendChart.left}
                                  y1={y}
                                  x2={donationTrendChart.left + donationTrendChart.plotWidth}
                                  y2={y}
                                  stroke="#e9ecef"
                                  strokeWidth="1"
                                />
                                <text x={donationTrendChart.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6c757d">
                                  {value.toLocaleString()}
                                </text>
                              </g>
                            );
                          })}

                          <path d={donationTrendChart.areaPath} fill="url(#donationTrendArea)" />
                          <path d={donationTrendChart.path} fill="none" stroke="#0d6efd" strokeWidth="2.5" />

                          {donationTrendChart.points.map((point, index) => (
                            <g key={point.month}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={11}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                tabIndex={0}
                                aria-label={`${point.label}: PHP ${point.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                onMouseEnter={() => setHoveredTrendPointIndex(index)}
                                onMouseLeave={() => setHoveredTrendPointIndex((current) => (current === index ? null : current))}
                                onFocus={() => setHoveredTrendPointIndex(index)}
                                onBlur={() => setHoveredTrendPointIndex((current) => (current === index ? null : current))}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={3.5}
                                fill="#0d6efd"
                              />
                              <text x={point.x} y={donationTrendChart.height - 14} textAnchor="middle" fontSize="10" fill="#6c757d">
                                {point.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                        {hoveredTrendPoint ? (
                          <div
                            className="position-absolute bg-dark text-white rounded px-2 py-1 small"
                            style={{
                              left: `calc(${((hoveredTrendPoint.x / donationTrendChart.width) * 100).toFixed(2)}% + 14px)`,
                              top: `${Math.max(6, hoveredTrendPoint.y - 56)}px`,
                              pointerEvents: 'none',
                              minWidth: '124px',
                              textAlign: 'center',
                              boxShadow: '0 8px 18px rgba(0,0,0,0.35)'
                            }}
                          >
                            <div>{hoveredTrendPoint.label}</div>
                            <div className="fw-semibold">
                              PHP {hoveredTrendPoint.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        ) : null}
                        <div className="small text-muted mt-2">
                          Peak month: PHP {donationTrendMax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="border rounded p-3 h-100">
                    <h4 className="h6 mb-3">Resident Outcome Metrics</h4>
                    <div className="row g-2">
                      <div className="col-12">
                        <div className="small text-muted">Education Progress (Average)</div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1">
                            <div
                              className={`progress-bar ${progressVariant(residentOutcomeMetrics.avgEducationProgress)}`}
                              style={{ width: `${Math.min(100, residentOutcomeMetrics.avgEducationProgress)}%` }}
                            />
                          </div>
                          <span className="small fw-semibold">{residentOutcomeMetrics.avgEducationProgress.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="small text-muted">Health score at/above threshold (≥ 3)</div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1">
                            <div
                              className={`progress-bar ${progressVariant(residentOutcomeMetrics.healthImprovementRate)}`}
                              style={{ width: `${Math.min(100, residentOutcomeMetrics.healthImprovementRate)}%` }}
                            />
                          </div>
                          <span className="small fw-semibold">{residentOutcomeMetrics.healthImprovementRate.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="col-12 pt-1">
                        <span className="badge text-bg-secondary">
                          Avg Health Score: {residentOutcomeMetrics.avgHealthScore.toFixed(2)} / 5
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-lg-8">
                  <div className="border rounded p-3 h-100">
                    <h4 className="h6 mb-3">Safehouse Performance Comparison</h4>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Safehouse</th>
                            <th>Occupancy</th>
                            <th className="text-center">Education</th>
                            <th className="text-center">Health</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safehouseComparisonRows.map((row) => (
                            <tr key={row.safehouseId}>
                              <td>{row.name}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="progress flex-grow-1" style={{ minWidth: 110 }}>
                                    <div className={`progress-bar ${progressVariant(row.occupancyRate)}`} style={{ width: `${Math.min(100, row.occupancyRate)}%` }} />
                                  </div>
                                  <span className="small">{row.occupancyRate.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="text-center">{row.educationProgress == null ? <span className="text-muted">No data</span> : `${row.educationProgress.toFixed(1)}%`}</td>
                              <td className="text-center">{row.healthScore == null ? <span className="text-muted">No data</span> : row.healthScore.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="border rounded p-3 h-100">
                    <h4 className="h6 mb-3">Reintegration Success Rate</h4>
                    <div className="display-6 mb-1">{reintegrationReport.successRate.toFixed(1)}%</div>
                    <p className="small text-muted mb-0">
                      {reintegrationReport.successful} successful outcomes out of {reintegrationReport.assessed} residents with tracked reintegration statuses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded p-3 mb-4">
                <h4 className="h6 mb-2">Social posts: what relates to engagement</h4>
                <p className="text-muted small mb-3">
                  A quick summary of what has historically been associated with <strong>higher</strong> or <strong>lower</strong>{' '}
                  engagement. Use these to guide experiments—not as guarantees.
                </p>
                {socialError ? <div className="alert alert-warning py-2 small">{socialError}</div> : null}
                {!social ? (
                  <p className="text-muted small mb-0">Loading social insights…</p>
                ) : (
                  <>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <h5 className="h6 mb-0">Patterns</h5>
                      <span className="small text-muted">
                        Showing statistically significant factors (p &lt; {(social.minP ?? 0.05).toFixed(2)}).
                      </span>
                    </div>
                    <SocialEngagementFactorList factors={social.factors ?? []} minP={social.minP} />
                    <details className="small mt-3">
                      <summary className="text-muted" style={{ cursor: 'pointer' }}>
                        Notes &amp; technical details
                      </summary>
                      <div className="mt-2 text-muted">
                        <p className="mb-2">
                          Each pattern compares a category choice to a baseline category that is not shown. “Lower” does not
                          mean “bad”—it means lower typical engagement than that baseline, after accounting for other fields
                          in the model.
                        </p>
                        {social.caveats ? (
                          <p className="mb-2 border-start border-3 ps-2">{social.caveats}</p>
                        ) : null}
                        <div className="row g-2">
                          {social.olsR2 != null ? <div className="col-auto">Pattern model R²: {social.olsR2.toFixed(3)}</div> : null}
                          {social.olsAdjR2 != null ? <div className="col-auto">Adjusted R²: {social.olsAdjR2.toFixed(3)}</div> : null}
                          {social.predictiveR2Holdout != null ? (
                            <div className="col-auto">Forecast model R² (holdout): {social.predictiveR2Holdout.toFixed(3)}</div>
                          ) : null}
                          {social.predictiveMaeHoldout != null ? (
                            <div className="col-auto">MAE (holdout): {social.predictiveMaeHoldout.toFixed(4)}</div>
                          ) : null}
                          {social.computedAt ? <div className="col-12">Insights last updated: {social.computedAt}</div> : null}
                        </div>
                      </div>
                    </details>
                  </>
                )}
              </div>

              <div className="border rounded p-3">
                <h4 className="h6 mb-3">Annual Accomplishment Report Alignment</h4>
                <p className="text-muted small">
                  Service tracking follows the Caring, Healing, Teaching framework with beneficiary and outcome summaries.
                </p>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Caring Services</div>
                      <div className="h4 mb-0">{annualAccomplishment.serviceCounts.caring}</div>
                      <div className="small text-muted">{annualAccomplishment.beneficiaries.caring} beneficiaries reached</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Healing Services</div>
                      <div className="h4 mb-0">{annualAccomplishment.serviceCounts.healing}</div>
                      <div className="small text-muted">{annualAccomplishment.beneficiaries.healing} beneficiaries reached</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-muted small">Teaching Services</div>
                      <div className="h4 mb-0">{annualAccomplishment.serviceCounts.teaching}</div>
                      <div className="small text-muted">{annualAccomplishment.beneficiaries.teaching} beneficiaries reached</div>
                    </div>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Total Beneficiaries</th>
                        <th>Active Cases</th>
                        <th>Avg Education Progress</th>
                        <th>Reintegration Success</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{annualAccomplishment.beneficiaries.totalBeneficiaries}</td>
                        <td>{annualAccomplishment.outcomes.activeCases}</td>
                        <td>{annualAccomplishment.outcomes.avgEducation.toFixed(1)}%</td>
                        <td>{annualAccomplishment.outcomes.reintegrationRate.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminReportsPage;
