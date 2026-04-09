using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/admin-reports")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]
public class AdminReportsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var donations = await db.Donations.ToListAsync();
        var residents = await db.Residents.ToListAsync();
        var safehouses = await db.Safehouses.ToListAsync();
        var safehouseMetrics = await db.SafehouseMonthlyMetrics.ToListAsync();
        var educationRecords = await db.EducationRecords.ToListAsync();
        var healthRecords = await db.HealthWellbeingRecords.ToListAsync();
        var plans = await db.InterventionPlans.ToListAsync();

        var monthlyTotals = new Dictionary<string, double>();
        foreach (var donation in donations)
        {
            if (!DateTime.TryParse(donation.DonationDate, out var parsed)) continue;
            var monthKey = $"{parsed.Year}-{parsed.Month:00}";
            var value = donation.Amount ?? donation.EstimatedValue ?? 0;
            monthlyTotals[monthKey] = (monthlyTotals.TryGetValue(monthKey, out var existing) ? existing : 0) + value;
        }

        var donationTrends = monthlyTotals
            .Select(entry => new { month = entry.Key, totalValue = entry.Value })
            .OrderBy(group => group.month)
            .TakeLast(12)
            .ToList();

        var avgEducationProgress = educationRecords.Count == 0 ? 0 : educationRecords.Average(r => r.ProgressPercent ?? 0);
        var avgHealthScore = healthRecords.Count == 0 ? 0 : healthRecords.Average(r => r.GeneralHealthScore ?? 0);
        var healthImprovementRate = healthRecords.Count == 0 ? 0 : healthRecords.Count(r => (r.GeneralHealthScore ?? 0) >= 3) * 100.0 / healthRecords.Count;

        var residentToSafehouse = residents
            .Where(r => r.ResidentId != 0 && r.SafehouseId.HasValue)
            .ToDictionary(r => r.ResidentId, r => r.SafehouseId!.Value);

        var educationFallbackBySafehouse = educationRecords
            .Where(record => record.ResidentId.HasValue
                             && residentToSafehouse.ContainsKey(record.ResidentId.Value)
                             && record.ProgressPercent.HasValue)
            .GroupBy(record => residentToSafehouse[record.ResidentId!.Value])
            .ToDictionary(group => group.Key, group => group.Average(record => record.ProgressPercent ?? 0));

        var healthFallbackBySafehouse = healthRecords
            .Where(record => record.ResidentId.HasValue
                             && residentToSafehouse.ContainsKey(record.ResidentId.Value)
                             && record.GeneralHealthScore.HasValue)
            .GroupBy(record => residentToSafehouse[record.ResidentId!.Value])
            .ToDictionary(group => group.Key, group => group.Average(record => record.GeneralHealthScore ?? 0));

        var metricsBySafehouse = safehouseMetrics
            .Where(m => m.SafehouseId.HasValue)
            .GroupBy(m => m.SafehouseId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group
                    .OrderByDescending(m => m.MonthEnd)
                    .ThenByDescending(m => m.MonthStart)
                    .ToList());

        var safehouseComparison = safehouses
            .Select(safehouse =>
            {
                metricsBySafehouse.TryGetValue(safehouse.SafehouseId, out var metricRows);
                var latestMetric = metricRows?.FirstOrDefault();
                var latestEducationMetric = metricRows?.FirstOrDefault(m => m.AvgEducationProgress.HasValue);
                var latestHealthMetric = metricRows?.FirstOrDefault(m => m.AvgHealthScore.HasValue);

                var occupancy = safehouse.CurrentOccupancy ?? latestMetric?.ActiveResidents ?? 0;
                var capacity = safehouse.CapacityGirls ?? 0;
                var occupancyRate = capacity > 0 ? occupancy * 100.0 / capacity : 0;
                return new
                {
                    safehouseId = safehouse.SafehouseId,
                    name = safehouse.Name ?? safehouse.SafehouseCode ?? $"Safehouse #{safehouse.SafehouseId}",
                    occupancyRate,
                    educationProgress = latestEducationMetric?.AvgEducationProgress
                        ?? (educationFallbackBySafehouse.TryGetValue(safehouse.SafehouseId, out var educationFallback)
                            ? educationFallback
                            : null),
                    healthScore = latestHealthMetric?.AvgHealthScore
                        ?? (healthFallbackBySafehouse.TryGetValue(safehouse.SafehouseId, out var healthFallback)
                            ? healthFallback
                            : null)
                };
            })
            .OrderByDescending(row => row.occupancyRate)
            .ToList();

        static bool IsSuccessfulReintegrationStatus(string status)
        {
            var normalized = status.Trim().ToLowerInvariant();
            if (normalized.Length == 0) return false;

            // Match both seeded enums (e.g., "Completed") and real-world free-text variants.
            return normalized.Contains("reintegrat")
                   || normalized.Contains("reunif")
                   || normalized.Contains("with family")
                   || normalized.Contains("independent")
                   || normalized.Contains("successful")
                   || normalized.Contains("graduat")
                   || normalized.Contains("complete")
                   || normalized.Contains("completed")
                   || normalized.Contains("done")
                   || normalized.Contains("closed");
        }

        var statuses = residents
            .Select(r => r.ReintegrationStatus?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Cast<string>()
            .ToList();
        var successful = statuses.Count(IsSuccessfulReintegrationStatus);
        var reintegrationSuccessRate = statuses.Count == 0 ? 0 : successful * 100.0 / statuses.Count;

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

        foreach (var plan in plans)
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
                assessed = statuses.Count,
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

