using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize]
public class ResidentsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? caseStatus = null,
        [FromQuery] string? riskLevel = null,
        [FromQuery] int? safehouseId = null,
        [FromQuery] string? caseCategory = null)
    {
        var query = db.Residents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.InternalCode!.Contains(search) || r.CaseControlNo!.Contains(search) || r.AssignedSocialWorker!.Contains(search));

        if (!string.IsNullOrWhiteSpace(caseStatus))
            query = query.Where(r => r.CaseStatus == caseStatus);

        if (!string.IsNullOrWhiteSpace(riskLevel))
            query = query.Where(r => r.CurrentRiskLevel == riskLevel);

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(r => r.ResidentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.Residents.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] Resident resident)
    {
        db.Residents.Add(resident);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] Resident resident)
    {
        if (id != resident.ResidentId) return BadRequest();
        db.Entry(resident).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Residents.FindAsync(id);
        if (item is null) return NotFound();
        db.Residents.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("filter-options")]
    public async Task<IActionResult> GetFilterOptions()
    {
        var caseStatuses = await db.Residents.Select(r => r.CaseStatus).Distinct().Where(s => s != null).OrderBy(s => s).ToListAsync();
        var riskLevels = await db.Residents.Select(r => r.CurrentRiskLevel).Distinct().Where(s => s != null).OrderBy(s => s).ToListAsync();
        var caseCategories = await db.Residents.Select(r => r.CaseCategory).Distinct().Where(s => s != null).OrderBy(s => s).ToListAsync();
        return Ok(new { caseStatuses, riskLevels, caseCategories });
    }
}
