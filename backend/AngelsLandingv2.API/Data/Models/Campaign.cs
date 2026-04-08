using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class Campaign
{
    [Key]
    public int CampaignId { get; set; }
    public string? CampaignName { get; set; }
    public double? TotalValue { get; set; }
    public int? DonorCount { get; set; }
    public double? MeanValue { get; set; }
    public double? CompositeScore { get; set; }
    public int? Rank { get; set; }
    public string? Verdict { get; set; }
    public string? MlLastCalculated { get; set; }
}
