using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/donor-impact")]
[Authorize]
public class DonorImpactController(LighthouseDbContext db) : ControllerBase
{
    private static readonly string[] ReintegrationSuccessStatuses =
    [
        "Reintegrated",
        "Successful",
        "Independent Living",
        "With Family",
        "Reunified"
    ];

    private static string NormalizeBranding(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return value ?? string.Empty;

        return value
            .Replace("Lighthouse Sanctuary", "Angels' Landing", StringComparison.OrdinalIgnoreCase)
            .Replace("Lighthouse", "Angels' Landing", StringComparison.OrdinalIgnoreCase);
    }

    [HttpGet("summary")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSummary()
    {
        var allDonations = await db.Donations.ToListAsync();

        var totalGivingLifetime = allDonations.Sum(d => d.EstimatedValue ?? d.Amount ?? 0);
        var recurringCount = allDonations.Count(d => d.IsRecurring == true);
        var recurringValue = allDonations
            .Where(d => d.IsRecurring == true)
            .Sum(d => d.EstimatedValue ?? d.Amount ?? 0);

        var donationMix = allDonations
            .GroupBy(d => string.IsNullOrWhiteSpace(d.DonationType) ? "Unknown" : d.DonationType!)
            .Select(group =>
            {
                var value = group.Sum(d => d.EstimatedValue ?? d.Amount ?? 0);
                var percent = totalGivingLifetime <= 0 ? 0 : (value / totalGivingLifetime) * 100;
                return new
                {
                    donationType = group.Key,
                    value,
                    percent
                };
            })
            .OrderByDescending(row => row.value)
            .ToList();

        var latestMetricPeriod = await db.SafehouseMonthlyMetrics
            .OrderByDescending(m => m.MonthEnd)
            .ThenByDescending(m => m.MonthStart)
            .Select(m => new { m.MonthEnd, m.MonthStart })
            .FirstOrDefaultAsync();

        var activeResidents = latestMetricPeriod is not null
            ? await db.SafehouseMonthlyMetrics
                .Where(m => m.MonthEnd == latestMetricPeriod.MonthEnd && m.MonthStart == latestMetricPeriod.MonthStart)
                .SumAsync(m => m.ActiveResidents ?? 0)
            : await db.Residents.CountAsync(r => r.CaseStatus != null && r.CaseStatus.ToLower() == "active");

        var residentsWithStatus = await db.Residents
            .Where(r => !string.IsNullOrWhiteSpace(r.ReintegrationStatus))
            .Select(r => r.ReintegrationStatus!)
            .ToListAsync();
        var reintegrationSuccessful = residentsWithStatus.Count(status =>
            ReintegrationSuccessStatuses.Any(success =>
                string.Equals(success, status.Trim(), StringComparison.OrdinalIgnoreCase)));
        var reintegrationRate = residentsWithStatus.Count == 0
            ? 0
            : (double)reintegrationSuccessful / residentsWithStatus.Count * 100;

        var avgEducationProgress = await db.EducationRecords
            .Where(r => r.ProgressPercent.HasValue)
            .AverageAsync(r => (double?)r.ProgressPercent) ?? 0;

        var healthRecords = await db.HealthWellbeingRecords
            .Where(r => r.NutritionScore.HasValue && r.SleepQualityScore.HasValue)
            .Select(r => new { nutrition = r.NutritionScore!.Value, sleep = r.SleepQualityScore!.Value })
            .ToListAsync();
        var healthGoalsMetCount = healthRecords.Count(r => r.nutrition >= 70 && r.sleep >= 70);
        var healthGoalsMetRate = healthRecords.Count == 0 ? 0 : (double)healthGoalsMetCount / healthRecords.Count * 100;

        var publishedSnapshot = await db.PublicImpactSnapshots
            .Where(s => s.IsPublished == true)
            .OrderByDescending(s => s.PublishedAt)
            .ThenByDescending(s => s.SnapshotDate)
            .Select(s => new
            {
                snapshotDate = s.SnapshotDate,
                headline = s.Headline,
                summaryText = s.SummaryText,
                metricPayloadJson = s.MetricPayloadJson
            })
            .FirstOrDefaultAsync();

        var currentYear = DateTime.UtcNow.Year;
        var currentYearDonations = allDonations
            .Select(d =>
            {
                var hasDate = DateTime.TryParse(d.DonationDate, out var parsedDate);
                return new
                {
                    donation = d,
                    hasDate,
                    parsedDate
                };
            })
            .Where(row => row.hasDate && row.parsedDate.Year == currentYear)
            .ToList();

        var yearlyContribution = currentYearDonations
            .Sum(row => row.donation.EstimatedValue ?? row.donation.Amount ?? 0);

        var monthlyContributionTotals = currentYearDonations
            .GroupBy(row => new { row.parsedDate.Year, row.parsedDate.Month })
            .Select(group => group.Sum(row => row.donation.EstimatedValue ?? row.donation.Amount ?? 0))
            .Where(total => total > 0)
            .ToList();

        var averageMonthlyContribution = monthlyContributionTotals.Any() ? monthlyContributionTotals.Average() : 0;
        var counselingMonthsEquivalent = averageMonthlyContribution <= 0
            ? 0
            : yearlyContribution / averageMonthlyContribution;

        var donorCampaigns = allDonations
            .Where(d => !string.IsNullOrWhiteSpace(d.CampaignName))
            .GroupBy(d => d.CampaignName!.Trim())
            .Select(group => new
            {
                campaignName = group.Key,
                donorValue = group.Sum(d => d.EstimatedValue ?? d.Amount ?? 0)
            })
            .OrderByDescending(row => row.donorValue)
            .ToList();

        var campaignTotals = await db.Donations
            .Where(d => d.CampaignName != null)
            .GroupBy(d => d.CampaignName!)
            .Select(group => new
            {
                campaignName = group.Key,
                totalValue = group.Sum(d => d.EstimatedValue ?? d.Amount ?? 0)
            })
            .ToListAsync();

        var campaignOutcomes = donorCampaigns
            .Select(campaign =>
            {
                var campaignTotal = campaignTotals
                    .FirstOrDefault(c => string.Equals(c.campaignName.Trim(), campaign.campaignName, StringComparison.OrdinalIgnoreCase))
                    ?.totalValue ?? 0;
                var sharePercent = campaignTotal <= 0 ? 0 : campaign.donorValue / campaignTotal * 100;
                return new
                {
                    campaignName = campaign.campaignName,
                    donorValue = campaign.donorValue,
                    campaignTotal,
                    donorSharePercent = sharePercent
                };
            })
            .ToList();

        var recurringSharePercent = totalGivingLifetime <= 0
            ? 0
            : recurringValue / totalGivingLifetime * 100;

        var topDonationMix = donationMix.FirstOrDefault();
        var topCampaignOutcome = campaignOutcomes
            .OrderByDescending(campaign => campaign.donorValue)
            .FirstOrDefault();

        var topInsights = new List<string>();
        if (topDonationMix is not null)
        {
            topInsights.Add(
                $"Largest contribution type is {topDonationMix.donationType} at {topDonationMix.percent:N1}% of all donation value.");
        }

        if (recurringCount > 0)
        {
            topInsights.Add(
                $"Recurring donations represent {recurringSharePercent:N1}% of lifetime value across {recurringCount} recurring gifts.");
        }
        else
        {
            topInsights.Add("No recurring donations are currently recorded.");
        }

        topInsights.Add(
            $"Current reintegration success is {reintegrationRate:N1}% with {healthGoalsMetRate:N1}% meeting tracked health goals.");

        if (topCampaignOutcome is not null)
        {
            topInsights.Add(
                $"{topCampaignOutcome.campaignName} is the strongest campaign contributor at PHP {topCampaignOutcome.donorValue:N2}.");
        }

        if (topInsights.Count == 0)
        {
            topInsights.Add("Additional insights will appear once donation and resident outcome records are available.");
        }

        var isPipelineBacked = !string.IsNullOrWhiteSpace(publishedSnapshot?.metricPayloadJson);
        var explanatoryPlaceholder = isPipelineBacked
            ? "Insights include data from the latest published impact snapshot payload."
            : "Insights are derived from live donation, resident, education, and health records.";

        var dataCoverageText =
            $"Data coverage: {allDonations.Count} donations, {activeResidents} active residents, {campaignOutcomes.Count} campaign outcome rows.";

        var monthEquivalentAssumption = averageMonthlyContribution <= 0
            ? $"No monthly baseline is available for {currentYear} yet."
            : $"1 month equivalent = average monthly donation volume in {currentYear} (PHP {averageMonthlyContribution:N2}).";

        var normalizedPublishedSnapshot = publishedSnapshot is null
            ? null
            : new
            {
                snapshotDate = publishedSnapshot.snapshotDate,
                headline = NormalizeBranding(publishedSnapshot.headline),
                summaryText = NormalizeBranding(publishedSnapshot.summaryText),
                metricPayloadJson = publishedSnapshot.metricPayloadJson
            };

        return Ok(new
        {
            personalContributionSummary = new
            {
                totalGivingLifetime,
                donationMix,
                recurringStatus = new
                {
                    recurringDonationCount = recurringCount,
                    recurringEstimatedValue = recurringValue
                }
            },
            organizationalImpact = new
            {
                activeResidents,
                reintegrationSuccessRate = reintegrationRate,
                educationalProgressAveragePercent = avgEducationProgress,
                healthWellbeingGoalsMetPercent = healthGoalsMetRate,
                latestPublishedSnapshot = normalizedPublishedSnapshot
            },
            connection = new
            {
                donorContributionThisYear = yearlyContribution,
                counselingMonthsEquivalent,
                assumption = monthEquivalentAssumption,
                campaignOutcomes
            },
            explanatoryModel = new
            {
                topInsights,
                isPipelineBacked,
                placeholder = explanatoryPlaceholder
            },
            reportPlaceholders = new
            {
                pipeline455 = dataCoverageText
            }
        });
    }
}
