using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class IncidentReport
{
    [Key]
    public int IncidentId { get; set; }
    public int? ResidentId { get; set; }
    public int? SafehouseId { get; set; }
    public string? IncidentDate { get; set; }
    public string? IncidentType { get; set; }
    public string? Severity { get; set; }
    public string? Description { get; set; }
    public string? ResponseTaken { get; set; }
    public bool? Resolved { get; set; }
    public string? ResolutionDate { get; set; }
    public string? ReportedBy { get; set; }
    public bool? FollowUpRequired { get; set; }
}
