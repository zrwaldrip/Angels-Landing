using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/safehouse-metrics")]
[Authorize]
public class SafehouseMonthlyMetricsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? safehouseId = null)
    {
        var query = db.SafehouseMonthlyMetrics.AsQueryable();
        if (safehouseId.HasValue)
            query = query.Where(m => m.SafehouseId == safehouseId);
        var items = await query.OrderBy(m => m.SafehouseId).ThenBy(m => m.MonthStart).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.SafehouseMonthlyMetrics.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] SafehouseMonthlyMetric metric)
    {
        db.SafehouseMonthlyMetrics.Add(metric);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = metric.MetricId }, metric);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] SafehouseMonthlyMetric metric)
    {
        if (id != metric.MetricId) return BadRequest();
        db.Entry(metric).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.SafehouseMonthlyMetrics.FindAsync(id);
        if (item is null) return NotFound();
        db.SafehouseMonthlyMetrics.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
