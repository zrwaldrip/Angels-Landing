using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class Donation
{
    [Key]
    public int DonationId { get; set; }
    public int? SupporterId { get; set; }
    public string? DonationType { get; set; }
    public string? DonationDate { get; set; }
    public bool? IsRecurring { get; set; }
    public string? CampaignName { get; set; }
    public string? ChannelSource { get; set; }
    public string? CurrencyCode { get; set; }
    public double? Amount { get; set; }
    public double? EstimatedValue { get; set; }
    public string? ImpactUnit { get; set; }
    public string? Notes { get; set; }
    public int? ReferralPostId { get; set; }
}
