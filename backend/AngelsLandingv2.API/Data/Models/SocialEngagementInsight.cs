using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class SocialEngagementInsight
{
    [Key]
    public int SocialEngagementInsightId { get; set; }

    [MaxLength(128)]
    public string? FactorKey { get; set; }

    [MaxLength(256)]
    public string? DisplayName { get; set; }

    public double? Coefficient { get; set; }
    public double? PValue { get; set; }
    public int? RankOrder { get; set; }

    [MaxLength(64)]
    public string? ComputedAt { get; set; }

    [MaxLength(64)]
    public string? ModelVersion { get; set; }

    // Snapshot meta duplicated on each row (single-table approach)
    public string? Caveats { get; set; }
    public double? OlsR2 { get; set; }
    public double? OlsAdjR2 { get; set; }
    public double? PredictiveMaeHoldout { get; set; }
    public double? PredictiveR2Holdout { get; set; }
}
