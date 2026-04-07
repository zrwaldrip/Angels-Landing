using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/intervention-plans")]
[Authorize]
public class InterventionPlansController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? residentId = null)
    {
        var query = db.InterventionPlans.AsQueryable();
        if (residentId.HasValue) query = query.Where(p => p.ResidentId == residentId);
        return Ok(await query.OrderBy(p => p.PlanId).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.InterventionPlans.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] InterventionPlan plan)
    {
        db.InterventionPlans.Add(plan);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = plan.PlanId }, plan);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] InterventionPlan plan)
    {
        if (id != plan.PlanId) return BadRequest();
        db.Entry(plan).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.InterventionPlans.FindAsync(id);
        if (item is null) return NotFound();
        db.InterventionPlans.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
