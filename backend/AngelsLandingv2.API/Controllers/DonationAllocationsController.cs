using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/donation-allocations")]
[Authorize]
public class DonationAllocationsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? donationId = null)
    {
        var query = db.DonationAllocations.AsQueryable();
        if (donationId.HasValue) query = query.Where(a => a.DonationId == donationId);
        return Ok(await query.OrderBy(a => a.AllocationId).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.DonationAllocations.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] DonationAllocation allocation)
    {
        db.DonationAllocations.Add(allocation);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = allocation.AllocationId }, allocation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] DonationAllocation allocation)
    {
        if (id != allocation.AllocationId) return BadRequest();
        db.Entry(allocation).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.DonationAllocations.FindAsync(id);
        if (item is null) return NotFound();
        db.DonationAllocations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
