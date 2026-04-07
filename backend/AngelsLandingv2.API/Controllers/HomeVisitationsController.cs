using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/home-visitations")]
[Authorize]
public class HomeVisitationsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? residentId = null)
    {
        var query = db.HomeVisitations.AsQueryable();
        if (residentId.HasValue) query = query.Where(v => v.ResidentId == residentId);
        return Ok(await query.OrderByDescending(v => v.VisitDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.HomeVisitations.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] HomeVisitation visitation)
    {
        db.HomeVisitations.Add(visitation);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = visitation.VisitationId }, visitation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] HomeVisitation visitation)
    {
        if (id != visitation.VisitationId) return BadRequest();
        db.Entry(visitation).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.HomeVisitations.FindAsync(id);
        if (item is null) return NotFound();
        db.HomeVisitations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
