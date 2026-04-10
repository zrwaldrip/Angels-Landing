using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/admin-reports")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]
public class SocialEngagementInsightsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet("social-engagement")]
    public async Task<IActionResult> GetSocialEngagement()
    {
        var minP = 0.05;
        if (Request.Query.TryGetValue("minP", out var minPValues)
            && double.TryParse(minPValues.FirstOrDefault(), out var parsedMinP)
            && parsedMinP > 0
            && parsedMinP < 1)
        {
            minP = parsedMinP;
        }

        var insights = await db.SocialEngagementInsights
            .AsNoTracking()
            .OrderBy(i => i.RankOrder ?? int.MaxValue)
            .ToListAsync();

        var metaRow = insights.FirstOrDefault();
        var factors = insights
            .Where(i => i.PValue != null && i.PValue < minP)
            .Select(i => new FactorDto
            {
                factorKey = i.FactorKey,
                displayName = i.DisplayName,
                coefficient = i.Coefficient,
                pValue = i.PValue,
                rankOrder = i.RankOrder,
                computedAt = i.ComputedAt,
                modelVersion = i.ModelVersion
            })
            .ToList();

        var posts = await db.SocialMediaPosts
            .AsNoTracking()
            .Where(p => p.PredictedEngagementRate != null && p.EngagementRate != null)
            .OrderByDescending(p => p.CreatedAt)
            .Take(80)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.PostType,
                p.CreatedAt,
                engagementRate = p.EngagementRate,
                predictedEngagementRate = p.PredictedEngagementRate,
                p.EngagementScoredAt
            })
            .ToListAsync();

        return Ok(new
        {
            caveats = metaRow?.Caveats,
            modelVersion = metaRow?.ModelVersion,
            computedAt = metaRow?.ComputedAt,
            olsR2 = metaRow?.OlsR2,
            olsAdjR2 = metaRow?.OlsAdjR2,
            predictiveMaeHoldout = metaRow?.PredictiveMaeHoldout,
            predictiveR2Holdout = metaRow?.PredictiveR2Holdout,
            minP,
            factors,
            posts
        });
    }

    private sealed class FactorDto
    {
        public string? factorKey { get; set; }
        public string? displayName { get; set; }
        public double? coefficient { get; set; }
        public double? pValue { get; set; }
        public int? rankOrder { get; set; }
        public string? computedAt { get; set; }
        public string? modelVersion { get; set; }
    }
}
