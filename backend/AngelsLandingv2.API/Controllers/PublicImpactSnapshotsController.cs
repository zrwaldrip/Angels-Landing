using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/impact-snapshots")]
[Authorize]
public class PublicImpactSnapshotsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? published = null)
    {
        var query = db.PublicImpactSnapshots.AsQueryable();
        if (published.HasValue) query = query.Where(s => s.IsPublished == published);
        return Ok(await query.OrderByDescending(s => s.SnapshotDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.PublicImpactSnapshots.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] PublicImpactSnapshot snapshot)
    {
        db.PublicImpactSnapshots.Add(snapshot);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = snapshot.SnapshotId }, snapshot);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] PublicImpactSnapshot snapshot)
    {
        if (id != snapshot.SnapshotId) return BadRequest();
        db.Entry(snapshot).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.PublicImpactSnapshots.FindAsync(id);
        if (item is null) return NotFound();
        db.PublicImpactSnapshots.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
