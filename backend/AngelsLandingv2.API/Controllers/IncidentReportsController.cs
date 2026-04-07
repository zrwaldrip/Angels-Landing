using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/incident-reports")]
[Authorize]
public class IncidentReportsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? residentId = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? severity = null)
    {
        var query = db.IncidentReports.AsQueryable();
        if (residentId.HasValue) query = query.Where(i => i.ResidentId == residentId);
        if (safehouseId.HasValue) query = query.Where(i => i.SafehouseId == safehouseId);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(i => i.Severity == severity);
        return Ok(await query.OrderByDescending(i => i.IncidentDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.IncidentReports.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] IncidentReport report)
    {
        db.IncidentReports.Add(report);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = report.IncidentId }, report);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] IncidentReport report)
    {
        if (id != report.IncidentId) return BadRequest();
        db.Entry(report).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.IncidentReports.FindAsync(id);
        if (item is null) return NotFound();
        db.IncidentReports.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
