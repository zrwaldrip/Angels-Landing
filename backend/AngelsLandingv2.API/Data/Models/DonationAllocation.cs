using System.ComponentModel.DataAnnotations;

namespace AngelsLandingv2.API.Data.Models;

public class DonationAllocation
{
    [Key]
    public int AllocationId { get; set; }
    public int? DonationId { get; set; }
    public int? SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public double? AmountAllocated { get; set; }
    public string? AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }
}
