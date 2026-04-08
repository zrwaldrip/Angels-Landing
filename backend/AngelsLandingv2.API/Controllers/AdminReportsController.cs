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

        var latestMetricBySafehouse = safehouseMetrics
            .Where(m => m.SafehouseId.HasValue)
            .GroupBy(m => m.SafehouseId!.Value)
            .Select(group =>
                group
                .OrderByDescending(m => m.MonthEnd)
                .ThenByDescending(m => m.MonthStart)
                .First())
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

        var statuses = residents
            .Select(r => r.ReintegrationStatus?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Cast<string>()
            .ToList();
        var successStatuses = new[] { "reintegrated", "successful", "independent living", "with family", "reunified" };
        var successful = statuses.Count(status => successStatuses.Contains(status.ToLowerInvariant()));
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

