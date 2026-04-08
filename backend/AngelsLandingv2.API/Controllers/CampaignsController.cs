using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/campaigns")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]
public class CampaignsController(LighthouseDbContext db) : ControllerBase
{
    // GET /api/campaigns
    // Returns all campaigns sorted by rank (populated by campaign_scorer.py)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await db.Campaigns
            .OrderBy(c => c.Rank)
            .ToListAsync();
        return Ok(items);
    }

    // GET /api/campaigns/channel-breakdown
    // Returns donation totals grouped by campaign + channel — powers the channel chart
    [HttpGet("channel-breakdown")]
    public async Task<IActionResult> GetChannelBreakdown()
    {
        var breakdown = await db.Donations
            .Where(d => d.EstimatedValue != null)
            .GroupBy(d => new
            {
                Campaign = d.CampaignName ?? "No Campaign",
                Channel  = d.ChannelSource  ?? "Unknown"
            })
            .Select(g => new
            {
                g.Key.Campaign,
                g.Key.Channel,
                TotalValue  = g.Sum(d => d.EstimatedValue),
                DonorCount  = g.Select(d => d.SupporterId).Distinct().Count()
            })
            .OrderBy(x => x.Campaign)
            .ThenByDescending(x => x.TotalValue)
            .ToListAsync();

        return Ok(breakdown);
    }

    // GET /api/campaigns/monthly-trend
    // Returns donation totals grouped by campaign + month (YYYY-MM) for the time-series chart
    [HttpGet("monthly-trend")]
    public async Task<IActionResult> GetMonthlyTrend()
    {
        var raw = await db.Donations
            .Where(d => d.EstimatedValue != null
                && d.CampaignName != null
                && d.DonationDate != null)
            .Select(d => new { d.CampaignName, d.DonationDate, d.EstimatedValue })
            .ToListAsync();

        var grouped = raw
            .Select(d =>
            {
                DateTime.TryParse(d.DonationDate, out var dt);
                return new
                {
                    Campaign = d.CampaignName!.Trim(),
                    Month    = dt == default ? null : dt.ToString("yyyy-MM"),
                    d.EstimatedValue
                };
            })
            .Where(x => x.Month != null && x.Campaign != "")
            .GroupBy(x => new { x.Campaign, x.Month })
            .Select(g => new
            {
                Campaign   = g.Key.Campaign,
                Month      = g.Key.Month,
                TotalValue = Math.Round(g.Sum(x => x.EstimatedValue ?? 0), 2)
            })
            .OrderBy(x => x.Month)
            .ThenBy(x => x.Campaign)
            .ToList();

        return Ok(grouped);
    }

    // GET /api/campaigns/feature-importance
    // Returns decision-tree feature importances written by campaign_scorer.py
    [HttpGet("feature-importance")]
    public async Task<IActionResult> GetFeatureImportance()
    {
        var items = await db.FeatureImportances
            .OrderByDescending(f => f.Importance)
            .ToListAsync();
        return Ok(items);
    }
}
