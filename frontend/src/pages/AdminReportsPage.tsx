import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import {
  getDonations,
  getResidents,
  getSafehouses,
  getSafehouseMetrics,
  getEducationRecords,
  getHealthRecords,
  getInterventionPlans,
  type Donation,
  type EducationRecord,
  type HealthRecord,
  type InterventionPlan,
  type Resident,
  type Safehouse,
  type SafehouseMetric,
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

function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDonations, setReportDonations] = useState<Donation[]>([]);
  const [reportResidents, setReportResidents] = useState<Resident[]>([]);
  const [reportSafehouses, setReportSafehouses] = useState<Safehouse[]>([]);
  const [reportSafehouseMetrics, setReportSafehouseMetrics] = useState<SafehouseMetric[]>([]);
  const [reportEducationRecords, setReportEducationRecords] = useState<EducationRecord[]>([]);
  const [reportHealthRecords, setReportHealthRecords] = useState<HealthRecord[]>([]);
  const [reportInterventionPlans, setReportInterventionPlans] = useState<InterventionPlan[]>([]);
  const [hoveredTrendPointIndex, setHoveredTrendPointIndex] = useState<number | null>(null);

  useEffect(() => {
    void loadReportsData();
  }, []);

  async function loadReportsData() {
    setLoading(true);
    setError('');
    try {
      const [donationData, residentData, safehouseData, safehouseMetricData, educationData, healthData, interventionData] = await Promise.all([
        getDonations({ page: 1, pageSize: 1000 }),
        getResidents({ page: 1, pageSize: 1000 }),
        getSafehouses(),
        getSafehouseMetrics(),
        getEducationRecords(),
        getHealthRecords(),
        getInterventionPlans(),
      ]);
      setReportDonations(donationData.items ?? []);
      setReportResidents(residentData.items ?? []);
      setReportSafehouses(safehouseData ?? []);
      setReportSafehouseMetrics(safehouseMetricData ?? []);
      setReportEducationRecords(educationData ?? []);
      setReportHealthRecords(healthData ?? []);
      setReportInterventionPlans(interventionData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics reports.');
    } finally {
      setLoading(false);
    }
  }

  const donationTrendRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const donation of reportDonations) {
      const key = normalizeMonthKey(donation.donationDate);
      if (!key) continue;
      const value = donation.amount ?? donation.estimatedValue ?? 0;
      map.set(key, (map.get(key) ?? 0) + value);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, totalValue]) => ({ month, label: monthLabel(month), totalValue }));
  }, [reportDonations]);

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
    const avgEducationProgress = reportEducationRecords.length === 0
      ? 0
      : reportEducationRecords.reduce((sum, record) => sum + (record.progressPercent ?? 0), 0) / reportEducationRecords.length;
    const avgHealthScore = reportHealthRecords.length === 0
      ? 0
      : reportHealthRecords.reduce((sum, record) => sum + (record.generalHealthScore ?? 0), 0) / reportHealthRecords.length;
    const healthImprovedCount = reportHealthRecords.filter((record) => (record.generalHealthScore ?? 0) >= 3).length;
    const healthImprovementRate = reportHealthRecords.length === 0
      ? 0
      : (healthImprovedCount / reportHealthRecords.length) * 100;
    return { avgEducationProgress, avgHealthScore, healthImprovementRate };
  }, [reportEducationRecords, reportHealthRecords]);

  const safehouseComparisonRows = useMemo(() => {
    const latestMetricBySafehouse = new Map<number, SafehouseMetric>();
    for (const metric of reportSafehouseMetrics) {
      if (metric.safehouseId == null) continue;
      const current = latestMetricBySafehouse.get(metric.safehouseId);
      const currentDate = current?.monthEnd ?? current?.monthStart ?? '';
      const nextDate = metric.monthEnd ?? metric.monthStart ?? '';
      if (!current || nextDate > currentDate) latestMetricBySafehouse.set(metric.safehouseId, metric);
    }

    return reportSafehouses.map((safehouse) => {
      const metric = latestMetricBySafehouse.get(safehouse.safehouseId);
      const occupancy = safehouse.currentOccupancy ?? metric?.activeResidents ?? 0;
      const capacity = safehouse.capacityGirls ?? 0;
      const occupancyRate = capacity > 0 ? (occupancy / capacity) * 100 : 0;
      return {
        safehouseId: safehouse.safehouseId,
        name: safehouse.name ?? safehouse.safehouseCode ?? `Safehouse #${safehouse.safehouseId}`,
        occupancyRate,
        educationProgress: metric?.avgEducationProgress ?? null,
        healthScore: metric?.avgHealthScore ?? null,
      };
    }).sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [reportSafehouses, reportSafehouseMetrics]);

  const reintegrationReport = useMemo(() => {
    const statuses = reportResidents
      .map((resident) => resident.reintegrationStatus?.trim())
      .filter((status): status is string => Boolean(status));
    const successStatuses = ['reintegrated', 'successful', 'independent living', 'with family', 'reunified'];
    const successful = statuses.filter((status) => successStatuses.includes(status.toLowerCase())).length;
    const successRate = statuses.length === 0 ? 0 : (successful / statuses.length) * 100;
    return { assessed: statuses.length, successful, successRate };
  }, [reportResidents]);

  const annualAccomplishment = useMemo(() => {
    const caringKeywords = ['care', 'shelter', 'nutrition', 'food', 'home visitation'];
    const healingKeywords = ['healing', 'health', 'medical', 'counsel', 'therapy', 'psychological'];
    const teachingKeywords = ['teaching', 'education', 'school', 'training', 'skills', 'livelihood'];
    const serviceCounts = { caring: 0, healing: 0, teaching: 0 };
    const beneficiarySets = {
      caring: new Set<number>(),
      healing: new Set<number>(),
      teaching: new Set<number>(),
    };

    for (const plan of reportInterventionPlans) {
      const text = `${plan.planCategory ?? ''} ${plan.servicesProvided ?? ''} ${plan.planDescription ?? ''}`.toLowerCase();
      const residentId = plan.residentId ?? undefined;
      const isCaring = caringKeywords.some((keyword) => text.includes(keyword));
      const isHealing = healingKeywords.some((keyword) => text.includes(keyword));
      const isTeaching = teachingKeywords.some((keyword) => text.includes(keyword));

      if (isCaring) {
        serviceCounts.caring += 1;
        if (residentId != null) beneficiarySets.caring.add(residentId);
      }
      if (isHealing) {
        serviceCounts.healing += 1;
        if (residentId != null) beneficiarySets.healing.add(residentId);
      }
      if (isTeaching) {
        serviceCounts.teaching += 1;
        if (residentId != null) beneficiarySets.teaching.add(residentId);
      }
    }

    return {
      serviceCounts,
      beneficiaries: {
        caring: beneficiarySets.caring.size,
        healing: beneficiarySets.healing.size,
        teaching: beneficiarySets.teaching.size,
        totalBeneficiaries: new Set(reportResidents.map((resident) => resident.residentId)).size
      },
      outcomes: {
        activeCases: reportResidents.filter((resident) => (resident.caseStatus ?? '').toLowerCase() === 'active').length,
        avgEducation: residentOutcomeMetrics.avgEducationProgress,
        reintegrationRate: reintegrationReport.successRate,
      }
    };
  }, [reportInterventionPlans, reportResidents, residentOutcomeMetrics.avgEducationProgress, reintegrationReport.successRate]);

  return (
    <div className="container mt-2">
      <Header />
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="h4 mb-0">Reports &amp; Analytics</h2>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadReportsData()} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
          <p className="text-muted mb-4">
            Aggregated insights for donation trends, resident outcomes, safehouse performance, and reintegration success,
            aligned with annual accomplishment reporting structures used by social welfare agencies.
          </p>

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
                        <div className="small text-muted">Health Improvement Rate</div>
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
