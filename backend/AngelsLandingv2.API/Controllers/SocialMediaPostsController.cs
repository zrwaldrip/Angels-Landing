using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/social-media-posts")]
[Authorize]
public class SocialMediaPostsController(LighthouseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? platform = null)
    {
        var query = db.SocialMediaPosts.AsQueryable();
        if (!string.IsNullOrWhiteSpace(platform)) query = query.Where(p => p.Platform == platform);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.SocialMediaPosts.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] SocialMediaPost post)
    {
        db.SocialMediaPosts.Add(post);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = post.PostId }, post);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] SocialMediaPost post)
    {
        if (id != post.PostId) return BadRequest();
        db.Entry(post).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.SocialMediaPosts.FindAsync(id);
        if (item is null) return NotFound();
        db.SocialMediaPosts.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
