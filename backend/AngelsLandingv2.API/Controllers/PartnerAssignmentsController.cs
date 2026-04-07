using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/partner-assignments")]
[Authorize]
public class PartnerAssignmentsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? partnerId = null, [FromQuery] int? safehouseId = null)
    {
        var query = db.PartnerAssignments.AsQueryable();
        if (partnerId.HasValue) query = query.Where(a => a.PartnerId == partnerId);
        if (safehouseId.HasValue) query = query.Where(a => a.SafehouseId == safehouseId);
        return Ok(await query.OrderBy(a => a.AssignmentId).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.PartnerAssignments.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] PartnerAssignment assignment)
    {
        db.PartnerAssignments.Add(assignment);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = assignment.AssignmentId }, assignment);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] PartnerAssignment assignment)
    {
        if (id != assignment.AssignmentId) return BadRequest();
        db.Entry(assignment).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.PartnerAssignments.FindAsync(id);
        if (item is null) return NotFound();
        db.PartnerAssignments.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
