using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/inkind-items")]
[Authorize]
public class InKindDonationItemsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? donationId = null)
    {
        var query = db.InKindDonationItems.AsQueryable();
        if (donationId.HasValue) query = query.Where(i => i.DonationId == donationId);
        return Ok(await query.OrderBy(i => i.ItemId).ToListAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.InKindDonationItems.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] InKindDonationItem item)
    {
        db.InKindDonationItems.Add(item);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = item.ItemId }, item);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] InKindDonationItem item)
    {
        if (id != item.ItemId) return BadRequest();
        db.Entry(item).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.InKindDonationItems.FindAsync(id);
        if (item is null) return NotFound();
        db.InKindDonationItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
