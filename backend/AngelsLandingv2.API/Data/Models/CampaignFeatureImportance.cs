using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class CampaignFeatureImportance
{
    [Key]
    public int Id { get; set; }
    public string? Feature { get; set; }
    public double Importance { get; set; }
    public string? CalculatedAt { get; set; }
}
