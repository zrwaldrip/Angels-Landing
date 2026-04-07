using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class InterventionPlan
{
    [Key]
    public int PlanId { get; set; }
    public int? ResidentId { get; set; }
    public string? PlanCategory { get; set; }
    public string? PlanDescription { get; set; }
    public string? ServicesProvided { get; set; }
    public string? TargetValue { get; set; }
    public string? TargetDate { get; set; }
    public string? Status { get; set; }
    public string? CaseConferenceDate { get; set; }
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}
