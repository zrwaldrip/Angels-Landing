using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class SafehouseMonthlyMetric
{
    [Key]
    public int MetricId { get; set; }
    public int? SafehouseId { get; set; }
    public string? MonthStart { get; set; }
    public string? MonthEnd { get; set; }
    public int? ActiveResidents { get; set; }
    public double? AvgEducationProgress { get; set; }
    public double? AvgHealthScore { get; set; }
    public int? ProcessRecordingCount { get; set; }
    public int? HomeVisitationCount { get; set; }
    public int? IncidentCount { get; set; }
    public string? Notes { get; set; }
}
