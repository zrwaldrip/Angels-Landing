using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/health-records")]
[Authorize]
public class HealthWellbeingRecordsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? residentId = null)
    {
        var query = db.HealthWellbeingRecords.AsQueryable();
        if (residentId.HasValue) query = query.Where(r => r.ResidentId == residentId);
        return Ok(await query.OrderByDescending(r => r.RecordDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.HealthWellbeingRecords.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] HealthWellbeingRecord record)
    {
        db.HealthWellbeingRecords.Add(record);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = record.HealthRecordId }, record);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] HealthWellbeingRecord record)
    {
        if (id != record.HealthRecordId) return BadRequest();
        db.Entry(record).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.HealthWellbeingRecords.FindAsync(id);
        if (item is null) return NotFound();
        db.HealthWellbeingRecords.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
