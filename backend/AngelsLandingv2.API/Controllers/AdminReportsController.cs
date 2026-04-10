using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/admin-reports")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]
public class AdminReportsController(LighthouseDbContext db) : ControllerBase
{
    private static DateTime? ParseDateLoose(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        raw = raw.Trim();

        if (DateTime.TryParse(
                raw,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
            return parsed;

        var formats = new[]
        {
            "yyyy-MM-dd",
            "MM/dd/yyyy",
            "M/d/yyyy",
            "dd/MM/yyyy",
            "d/M/yyyy"
        };

        if (DateTime.TryParseExact(
                raw,
                formats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out parsed))
            return parsed;

        return null;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var residents = await db.Residents.AsNoTracking().ToListAsync();
        var safehouses = await db.Safehouses.AsNoTracking().ToListAsync();

        // Donations: month buckets over the rolling 12-month window.
        // Business rule: use Amount when present; otherwise fall back to EstimatedValue.
        var donations = await db.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null)
            .ToListAsync();

        var educationRecords = await db.EducationRecords
            .AsNoTracking()
            .Where(r => r.RecordDate != null && r.ResidentId != null)
            .ToListAsync();

        var healthRecords = await db.HealthWellbeingRecords
            .AsNoTracking()
            .Where(r => r.RecordDate != null && r.ResidentId != null)
            .ToListAsync();

        var safehouseMetrics = await db.SafehouseMonthlyMetrics
            .AsNoTracking()
            .Where(m => m.SafehouseId != null)
            .ToListAsync();

        var plans = await db.InterventionPlans.AsNoTracking().ToListAsync();

        // Reporting window: anchor to the latest available data date (prevents "all zeros" in dev/staging
        // when seed data is older than today's date), falling back to now if no dated rows exist.
        DateTime? NotFuture(DateTime? dt)
        {
            if (dt == null) return null;
            return dt.Value <= DateTime.UtcNow ? dt : null;
        }

        var candidateDates = new List<DateTime?>
        {
            NotFuture(donations.Select(d => ParseDateLoose(d.DonationDate)).Max()),
            NotFuture(educationRecords.Select(r => ParseDateLoose(r.RecordDate)).Max()),
            NotFuture(healthRecords.Select(r => ParseDateLoose(r.RecordDate)).Max()),
            NotFuture(safehouseMetrics.Select(m => ParseDateLoose(m.MonthEnd) ?? ParseDateLoose(m.MonthStart)).Max()),
            NotFuture(residents.Select(r => ParseDateLoose(r.DateClosed) ?? ParseDateLoose(r.CreatedAt)).Max()),
            NotFuture(plans.Select(p => ParseDateLoose(p.UpdatedAt) ?? ParseDateLoose(p.CreatedAt) ?? ParseDateLoose(p.CaseConferenceDate) ?? ParseDateLoose(p.TargetDate)).Max())
        };

        var reportEnd = candidateDates.Where(d => d != null).Select(d => d!.Value).DefaultIfEmpty(DateTime.UtcNow).Max();
        var reportStart = reportEnd.AddMonths(-12);

        var monthKeys = Enumerable.Range(0, 12)
            .Select(offset => new DateTime(reportEnd.Year, reportEnd.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11 + offset))
            .Select(d => $"{d.Year}-{d.Month:00}")
            .ToList();
        var monthlyTotals = monthKeys.ToDictionary(k => k, _ => 0.0);

        foreach (var donation in donations)
        {
            var parsed = ParseDateLoose(donation.DonationDate);
            if (parsed == null) continue;
            if (parsed.Value < reportStart || parsed.Value > reportEnd) continue;
            var monthKey = $"{parsed.Value.Year}-{parsed.Value.Month:00}";
            if (!monthlyTotals.ContainsKey(monthKey)) continue;
            var value = donation.Amount ?? donation.EstimatedValue ?? 0;
            monthlyTotals[monthKey] += value;
        }

        var donationTrends = monthKeys
            .Select(key => new { month = key, totalValue = monthlyTotals[key] })
            .ToList();

        // Prefer SafehouseMonthlyMetrics for education/health rollups when available, since it is the
        // pre-aggregated operational snapshot used by stakeholders.
        var metricsInWindow = safehouseMetrics
            .Select(m => new
            {
                metric = m,
                effective = ParseDateLoose(m.MonthEnd) ?? ParseDateLoose(m.MonthStart)
            })
            .Where(x => x.effective != null && x.effective.Value >= reportStart && x.effective.Value <= reportEnd)
            .ToList();

        var latestMetricRowsInWindow = metricsInWindow
            .Where(x => x.metric.SafehouseId != null)
            .GroupBy(x => x.metric.SafehouseId!.Value)
            .Select(g => g.OrderByDescending(x => x.effective).First().metric)
            .ToList();

        // Education: latest record per resident within the window, averaged across residents with data.
        var educationLatestByResident = educationRecords
            .Select(r => new { r.ResidentId, r.ProgressPercent, recordDate = ParseDateLoose(r.RecordDate) })
            .Where(r => r.ResidentId != null && r.recordDate != null && r.recordDate.Value >= reportStart && r.recordDate.Value <= reportEnd)
            .GroupBy(r => r.ResidentId!.Value)
            .Select(g => g.OrderByDescending(x => x.recordDate).First())
            .ToList();
        var avgEducationProgressFromMetrics = latestMetricRowsInWindow
            .Where(m => m.AvgEducationProgress != null)
            .Select(m => m.AvgEducationProgress!.Value)
            .DefaultIfEmpty()
            .Average();
        var avgEducationProgressFromResidents = educationLatestByResident.Count == 0
            ? 0
            : educationLatestByResident.Average(r => r.ProgressPercent ?? 0);
        var avgEducationProgress = avgEducationProgressFromMetrics > 0 ? avgEducationProgressFromMetrics : avgEducationProgressFromResidents;

        // Health: latest record per resident within the window, averaged across residents with data.
        var healthLatestByResident = healthRecords
            .Select(r => new { r.ResidentId, r.GeneralHealthScore, recordDate = ParseDateLoose(r.RecordDate) })
            .Where(r => r.ResidentId != null && r.recordDate != null && r.recordDate.Value >= reportStart && r.recordDate.Value <= reportEnd)
            .GroupBy(r => r.ResidentId!.Value)
            .Select(g => g.OrderByDescending(x => x.recordDate).First())
            .ToList();

        var avgHealthScoreFromMetrics = latestMetricRowsInWindow
            .Where(m => m.AvgHealthScore != null)
            .Select(m => m.AvgHealthScore!.Value)
            .DefaultIfEmpty()
            .Average();
        var avgHealthScoreFromResidents = healthLatestByResident.Count == 0 ? 0 : healthLatestByResident.Average(r => r.GeneralHealthScore ?? 0);
        var avgHealthScore = avgHealthScoreFromMetrics > 0 ? avgHealthScoreFromMetrics : avgHealthScoreFromResidents;
        // Sanity guard: this score is expected to be on a 0–5 scale in the UI. Clamp implausible values.
        if (avgHealthScore < 0) avgHealthScore = 0;
        if (avgHealthScore > 5) avgHealthScore = 5;

        var healthImprovementRate = healthLatestByResident.Count == 0
            ? 0
            : healthLatestByResident.Count(r => (r.GeneralHealthScore ?? 0) >= 3) * 100.0 / healthLatestByResident.Count;

        // Safehouse metrics: latest metric with a date inside the window.
        var latestMetricBySafehouse = metricsInWindow
            .Where(x => x.metric.SafehouseId != null)
            .GroupBy(x => x.metric.SafehouseId!.Value)
            .Select(g => g.OrderByDescending(x => x.effective).First().metric)
            .ToDictionary(m => m.SafehouseId!.Value);

        var safehouseComparison = safehouses
            .Select(safehouse =>
            {
                latestMetricBySafehouse.TryGetValue(safehouse.SafehouseId, out var metric);
                var occupancy = safehouse.CurrentOccupancy ?? metric?.ActiveResidents ?? 0;
                var capacity = safehouse.CapacityGirls ?? 0;
                var occupancyRate = capacity > 0 ? occupancy * 100.0 / capacity : 0;
                return new
                {
                    safehouseId = safehouse.SafehouseId,
                    name = safehouse.Name ?? safehouse.SafehouseCode ?? $"Safehouse #{safehouse.SafehouseId}",
                    occupancyRate,
                    educationProgress = metric?.AvgEducationProgress,
                    healthScore = metric?.AvgHealthScore
                };
            })
            .OrderByDescending(row => row.occupancyRate)
            .ToList();

        // Reintegration: include only residents whose DateClosed (or CreatedAt fallback) falls inside the reporting window.
        var successStatuses = new[] { "reintegrated", "successful", "independent living", "with family", "reunified", "completed" };
        var reintegrationRows = residents
            .Select(r =>
            {
                var status = r.ReintegrationStatus?.Trim();
                var effectiveDate = ParseDateLoose(r.DateClosed) ?? ParseDateLoose(r.CreatedAt);
                return new { status, effectiveDate };
            })
            .Where(r => !string.IsNullOrWhiteSpace(r.status) && r.effectiveDate != null && r.effectiveDate.Value >= reportStart && r.effectiveDate.Value <= reportEnd)
            .ToList();
        var assessed = reintegrationRows.Count;
        var successful = reintegrationRows.Count(r => successStatuses.Contains((r.status ?? string.Empty).ToLowerInvariant()));
        var reintegrationSuccessRate = assessed == 0 ? 0 : successful * 100.0 / assessed;

        // Annual accomplishment: keyword matching on intervention plans inside the window.
        DateTime? PlanEffectiveDate(AngelsLandingv2.API.Data.Models.InterventionPlan plan)
        {
            var updated = ParseDateLoose(plan.UpdatedAt);
            if (updated != null) return updated;
            var created = ParseDateLoose(plan.CreatedAt);
            if (created != null) return created;
            var cc = ParseDateLoose(plan.CaseConferenceDate);
            if (cc != null) return cc;
            return ParseDateLoose(plan.TargetDate);
        }

        var recentPlans = plans
            .Select(p => new { plan = p, effective = PlanEffectiveDate(p) })
            .Where(p => p.effective != null && p.effective.Value >= reportStart && p.effective.Value <= reportEnd)
            .Select(p => p.plan)
            .ToList();

        var caringKeywords = new[] { "care", "shelter", "nutrition", "food", "home visitation" };
        var healingKeywords = new[] { "healing", "health", "medical", "counsel", "therapy", "psychological" };
        var teachingKeywords = new[] { "teaching", "education", "school", "training", "skills", "livelihood" };

        var serviceCounts = new Dictionary<string, int> { ["caring"] = 0, ["healing"] = 0, ["teaching"] = 0 };
        var beneficiarySets = new Dictionary<string, HashSet<int>>
        {
            ["caring"] = [],
            ["healing"] = [],
            ["teaching"] = []
        };

        foreach (var plan in recentPlans)
        {
            var text = $"{plan.PlanCategory ?? string.Empty} {plan.ServicesProvided ?? string.Empty} {plan.PlanDescription ?? string.Empty}".ToLowerInvariant();
            var residentId = plan.ResidentId;

            if (caringKeywords.Any(k => text.Contains(k)))
            {
                serviceCounts["caring"]++;
                if (residentId.HasValue) beneficiarySets["caring"].Add(residentId.Value);
            }
            if (healingKeywords.Any(k => text.Contains(k)))
            {
                serviceCounts["healing"]++;
                if (residentId.HasValue) beneficiarySets["healing"].Add(residentId.Value);
            }
            if (teachingKeywords.Any(k => text.Contains(k)))
            {
                serviceCounts["teaching"]++;
                if (residentId.HasValue) beneficiarySets["teaching"].Add(residentId.Value);
            }
        }

        var payload = new
        {
            reportPeriod = new
            {
                startUtc = reportStart.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                endUtc = reportEnd.ToString("yyyy-MM-ddTHH:mm:ssZ")
            },
            methodologyNotes = new[]
            {
                "Donation trends: monthly totals within the last 12 months using Amount when present, otherwise EstimatedValue.",
                "Education/health: latest record per resident within the window, averaged across residents with data.",
                "Health 'improvement rate' represents the share of residents with latest GeneralHealthScore ≥ 3 (threshold share, not a delta).",
                "Safehouse comparison uses the latest SafehouseMonthlyMetric whose month falls within the window when available."
            },
            donationTrends,
            residentOutcomeMetrics = new
            {
                avgEducationProgress,
                avgHealthScore,
                healthImprovementRate
            },
            safehouseComparison,
            reintegration = new
            {
                assessed,
                successful,
                successRate = reintegrationSuccessRate
            },
            annualAccomplishment = new
            {
                serviceCounts,
                beneficiaries = new
                {
                    caring = beneficiarySets["caring"].Count,
                    healing = beneficiarySets["healing"].Count,
                    teaching = beneficiarySets["teaching"].Count,
                    totalBeneficiaries = residents.Select(r => r.ResidentId).Distinct().Count()
                },
                outcomes = new
                {
                    activeCases = residents.Count(r => string.Equals(r.CaseStatus, "active", StringComparison.OrdinalIgnoreCase)),
                    avgEducation = avgEducationProgress,
                    reintegrationRate = reintegrationSuccessRate
                }
            }
        };

        return Ok(payload);
    }
}

