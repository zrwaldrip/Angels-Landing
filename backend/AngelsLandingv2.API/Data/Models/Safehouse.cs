using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class Safehouse
{
    [Key]
    public int SafehouseId { get; set; }
    public string? SafehouseCode { get; set; }
    public string? Name { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? OpenDate { get; set; }
    public string? Status { get; set; }
    public int? CapacityGirls { get; set; }
    public int? CapacityStaff { get; set; }
    public int? CurrentOccupancy { get; set; }
    public string? Notes { get; set; }
}
