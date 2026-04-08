using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AngelsLandingv2.API.Data;

public class AuthIdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthIdentityDbContext(DbContextOptions<AuthIdentityDbContext> options) : base(options)
    {
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnsureDefaultDonorRoleForAddedUsers();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        await EnsureDefaultDonorRoleForAddedUsersAsync(cancellationToken);
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void EnsureDefaultDonorRoleForAddedUsers()
    {
        var addedUserIds = ChangeTracker.Entries<ApplicationUser>()
            .Where(entry => entry.State == EntityState.Added)
            .Select(entry => entry.Entity.Id)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToArray();

        if (addedUserIds.Length == 0) return;

        var donorRoleId = Roles
            .Where(role => role.Name == AuthRoles.Donor)
            .Select(role => role.Id)
            .FirstOrDefault();

        if (string.IsNullOrWhiteSpace(donorRoleId)) return;

        var alreadyAssignedInTracker = ChangeTracker.Entries<IdentityUserRole<string>>()
            .Where(entry => entry.State != EntityState.Deleted && entry.Entity.RoleId == donorRoleId)
            .Select(entry => entry.Entity.UserId)
            .ToHashSet();

        var alreadyAssignedInDatabase = UserRoles
            .Where(userRole => userRole.RoleId == donorRoleId && addedUserIds.Contains(userRole.UserId))
            .Select(userRole => userRole.UserId)
            .ToHashSet();

        foreach (var userId in addedUserIds)
        {
            if (alreadyAssignedInTracker.Contains(userId) || alreadyAssignedInDatabase.Contains(userId)) continue;

            UserRoles.Add(new IdentityUserRole<string>
            {
                UserId = userId,
                RoleId = donorRoleId
            });
        }
    }

    private async Task EnsureDefaultDonorRoleForAddedUsersAsync(CancellationToken cancellationToken)
    {
        var addedUserIds = ChangeTracker.Entries<ApplicationUser>()
            .Where(entry => entry.State == EntityState.Added)
            .Select(entry => entry.Entity.Id)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToArray();

        if (addedUserIds.Length == 0) return;

        var donorRoleId = await Roles
            .Where(role => role.Name == AuthRoles.Donor)
            .Select(role => role.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(donorRoleId)) return;

        var alreadyAssignedInTracker = ChangeTracker.Entries<IdentityUserRole<string>>()
            .Where(entry => entry.State != EntityState.Deleted && entry.Entity.RoleId == donorRoleId)
            .Select(entry => entry.Entity.UserId)
            .ToHashSet();

        var alreadyAssignedInDatabase = await UserRoles
            .Where(userRole => userRole.RoleId == donorRoleId && addedUserIds.Contains(userRole.UserId))
            .Select(userRole => userRole.UserId)
            .ToListAsync(cancellationToken);

        foreach (var userId in addedUserIds)
        {
            if (alreadyAssignedInTracker.Contains(userId) || alreadyAssignedInDatabase.Contains(userId)) continue;

            UserRoles.Add(new IdentityUserRole<string>
            {
                UserId = userId,
                RoleId = donorRoleId
            });
        }
    }
}
