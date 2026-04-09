using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = AuthPolicies.ManageCatalog)]
public class AdminUsersController(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager) : ControllerBase
{
    private static readonly HashSet<string> AllowedManagedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        AuthRoles.Admin,
        AuthRoles.Donor
    };

    public sealed class AdminUserDto
    {
        public required string Id { get; set; }
        public string? Email { get; set; }
        public string? UserName { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public string? LockoutEndUtc { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public required string[] Roles { get; set; }
    }

    public sealed class UpdateUserRequest
    {
        public string[]? Roles { get; set; }
        public bool? EmailConfirmed { get; set; }
        public bool? LockoutEnabled { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = userManager.Users
            .OrderBy(u => u.Email)
            .ThenBy(u => u.UserName)
            .ToList();

        var output = new List<AdminUserDto>(users.Count);
        foreach (var user in users)
        {
            var roles = (await userManager.GetRolesAsync(user))
                .OrderBy(r => r)
                .ToArray();

            output.Add(new AdminUserDto
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName,
                EmailConfirmed = user.EmailConfirmed,
                LockoutEnabled = user.LockoutEnabled,
                LockoutEndUtc = user.LockoutEnd?.UtcDateTime.ToString("O"),
                TwoFactorEnabled = user.TwoFactorEnabled,
                Roles = roles
            });
        }

        return Ok(output);
    }

    [HttpPut("{userId}")]
    public async Task<IActionResult> Update(string userId, [FromBody] UpdateUserRequest request)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound(new { message = "User not found." });

        if (request.Roles is not null)
        {
            var normalizedRoles = request.Roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (normalizedRoles.Length == 0)
                return BadRequest(new { message = "At least one role is required." });

            if (normalizedRoles.Any(role => !AllowedManagedRoles.Contains(role)))
                return BadRequest(new { message = "Only Admin and Donor roles are allowed in this view." });

            // Admin role implicitly includes donor privileges in app authorization.
            // Keep persisted roles canonical: Admin-only accounts should not also store Donor.
            if (normalizedRoles.Contains(AuthRoles.Admin, StringComparer.OrdinalIgnoreCase))
            {
                normalizedRoles = normalizedRoles
                    .Where(role => !string.Equals(role, AuthRoles.Donor, StringComparison.OrdinalIgnoreCase))
                    .ToArray();
            }

            foreach (var role in normalizedRoles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    return BadRequest(new { message = $"Role '{role}' does not exist." });
            }

            var currentUserId = userManager.GetUserId(User);
            if (string.Equals(currentUserId, userId, StringComparison.Ordinal) &&
                !normalizedRoles.Contains(AuthRoles.Admin, StringComparer.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "You cannot remove your own Admin role." });
            }

            var existingRoles = await userManager.GetRolesAsync(user);
            var rolesToAdd = normalizedRoles.Except(existingRoles, StringComparer.OrdinalIgnoreCase).ToArray();
            var rolesToRemove = existingRoles.Except(normalizedRoles, StringComparer.OrdinalIgnoreCase).ToArray();

            if (rolesToAdd.Length > 0)
            {
                var addResult = await userManager.AddToRolesAsync(user, rolesToAdd);
                if (!addResult.Succeeded)
                    return BadRequest(new { message = string.Join("; ", addResult.Errors.Select(e => e.Description)) });
            }

            if (rolesToRemove.Length > 0)
            {
                var removeResult = await userManager.RemoveFromRolesAsync(user, rolesToRemove);
                if (!removeResult.Succeeded)
                    return BadRequest(new { message = string.Join("; ", removeResult.Errors.Select(e => e.Description)) });
            }
        }

        var changedUserFields = false;

        if (request.EmailConfirmed.HasValue && user.EmailConfirmed != request.EmailConfirmed.Value)
        {
            user.EmailConfirmed = request.EmailConfirmed.Value;
            changedUserFields = true;
        }

        if (request.LockoutEnabled.HasValue && user.LockoutEnabled != request.LockoutEnabled.Value)
        {
            user.LockoutEnabled = request.LockoutEnabled.Value;
            changedUserFields = true;

            if (!request.LockoutEnabled.Value)
            {
                var lockoutReset = await userManager.SetLockoutEndDateAsync(user, null);
                if (!lockoutReset.Succeeded)
                    return BadRequest(new { message = string.Join("; ", lockoutReset.Errors.Select(e => e.Description)) });
            }
        }

        if (changedUserFields)
        {
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
                return BadRequest(new { message = string.Join("; ", updateResult.Errors.Select(e => e.Description)) });
        }

        var roles = (await userManager.GetRolesAsync(user)).OrderBy(r => r).ToArray();
        return Ok(new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            EmailConfirmed = user.EmailConfirmed,
            LockoutEnabled = user.LockoutEnabled,
            LockoutEndUtc = user.LockoutEnd?.UtcDateTime.ToString("O"),
            TwoFactorEnabled = user.TwoFactorEnabled,
            Roles = roles
        });
    }

    [HttpDelete("{userId}")]
    public async Task<IActionResult> Delete(string userId)
    {
        var currentUserId = userManager.GetUserId(User);
        if (string.Equals(currentUserId, userId, StringComparison.Ordinal))
            return BadRequest(new { message = "You cannot delete your own account." });

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound(new { message = "User not found." });

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        return NoContent();
    }
}
