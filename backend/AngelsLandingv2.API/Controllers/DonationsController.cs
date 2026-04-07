using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? supporterId = null,
        [FromQuery] string? donationType = null)
    {
        var query = db.Donations.AsQueryable();
        if (supporterId.HasValue) query = query.Where(d => d.SupporterId == supporterId);
        if (!string.IsNullOrWhiteSpace(donationType)) query = query.Where(d => d.DonationType == donationType);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(d => d.DonationDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.Donations.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] Donation donation)
    {
        db.Donations.Add(donation);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = donation.DonationId }, donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] Donation donation)
    {
        if (id != donation.DonationId) return BadRequest();
        db.Entry(donation).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Donations.FindAsync(id);
        if (item is null) return NotFound();
        db.Donations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
