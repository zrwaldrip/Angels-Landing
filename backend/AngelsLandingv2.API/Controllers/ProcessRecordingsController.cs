using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize]
public class ProcessRecordingsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? residentId = null)
    {
        var query = db.ProcessRecordings.AsQueryable();
        if (residentId.HasValue) query = query.Where(r => r.ResidentId == residentId);
        return Ok(await query.OrderByDescending(r => r.SessionDate).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.ProcessRecordings.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] ProcessRecording recording)
    {
        db.ProcessRecordings.Add(recording);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = recording.RecordingId }, recording);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] ProcessRecording recording)
    {
        if (id != recording.RecordingId) return BadRequest();
        db.Entry(recording).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.ProcessRecordings.FindAsync(id);
        if (item is null) return NotFound();
        db.ProcessRecordings.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
