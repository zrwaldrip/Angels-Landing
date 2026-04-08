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
}
