using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class PublicImpactSnapshot
{
    [Key]
    public int SnapshotId { get; set; }
    public string? SnapshotDate { get; set; }
    public string? Headline { get; set; }
    public string? SummaryText { get; set; }
    public string? MetricPayloadJson { get; set; }
    public bool? IsPublished { get; set; }
    public string? PublishedAt { get; set; }
}
