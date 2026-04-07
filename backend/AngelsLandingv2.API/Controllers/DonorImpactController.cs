using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Signed-in account does not include an email claim." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var supporterIds = await db.Supporters
            .Where(s => s.Email != null && s.Email.Trim().ToLower() == normalizedEmail)
            .Select(s => s.SupporterId)
            .ToListAsync();

        var myDonations = await db.Donations
            .Where(d => d.SupporterId.HasValue && supporterIds.Contains(d.SupporterId.Value))
            .ToListAsync();

        var totalGivingLifetime = myDonations.Sum(d => d.EstimatedValue ?? d.Amount ?? 0);
        var recurringCount = myDonations.Count(d => d.IsRecurring == true);
        var recurringValue = myDonations
            .Where(d => d.IsRecurring == true)
            .Sum(d => d.EstimatedValue ?? d.Amount ?? 0);

        var donationMix = myDonations
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

        var activeResidentsFromMetrics = await db.SafehouseMonthlyMetrics
            .OrderByDescending(m => m.MonthEnd)
            .ThenByDescending(m => m.MonthStart)
            .Select(m => m.ActiveResidents)
            .ToListAsync();
        var activeResidents = activeResidentsFromMetrics.Any(v => v.HasValue)
            ? activeResidentsFromMetrics.Where(v => v.HasValue).Select(v => v!.Value).Sum()
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
        var yearlyContribution = myDonations
            .Where(d => DateTime.TryParse(d.DonationDate, out var parsedDate) && parsedDate.Year == currentYear)
            .Sum(d => d.EstimatedValue ?? d.Amount ?? 0);

        const double CounselingMonthEquivalentPhp = 2500;
        var counselingMonthsEquivalent = CounselingMonthEquivalentPhp == 0
            ? 0
            : yearlyContribution / CounselingMonthEquivalentPhp;

        var donorCampaigns = myDonations
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
                latestPublishedSnapshot = publishedSnapshot
            },
            connection = new
            {
                donorContributionThisYear = yearlyContribution,
                counselingMonthsEquivalent,
                assumption = $"1 counseling month equivalent = PHP {CounselingMonthEquivalentPhp:N0}",
                campaignOutcomes
            },
            explanatoryModel = new
            {
                topInsights = new[]
                {
                    "Consistent counseling participation is typically among the strongest predictors of successful reintegration.",
                    "Education progress and stable wellbeing scores together correlate with better transition outcomes."
                },
                isPipelineBacked = false,
                placeholder = "Reserved for IS 455 explanatory model pipeline outputs."
            },
            reportPlaceholders = new
            {
                pipeline455 = "Reserved for future pipeline-driven insights and score explanations."
            }
        });
    }
}
