using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/safehouses")]
[Authorize]
public class SafehousesController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await db.Safehouses.OrderBy(s => s.SafehouseId).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.Safehouses.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] Safehouse safehouse)
    {
        db.Safehouses.Add(safehouse);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] Safehouse safehouse)
    {
        if (id != safehouse.SafehouseId) return BadRequest();
        db.Entry(safehouse).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Safehouses.FindAsync(id);
        if (item is null) return NotFound();
        db.Safehouses.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
