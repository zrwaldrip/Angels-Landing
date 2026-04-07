using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AngelsLandingv2.API.Data;

/// <summary>
/// Used by EF Core tools (dotnet ef migrations) at design time.
/// Set ConnectionStrings__AngelsLandingIdentityConnection to Postgres for Npgsql migrations,
/// or Data Source=AngelsLandingIdentity.sqlite for a local SQLite context.
/// </summary>
public sealed class AuthIdentityDbContextFactory : IDesignTimeDbContextFactory<AuthIdentityDbContext>
{
    public AuthIdentityDbContext CreateDbContext(string[] args)
    {
        var cs =
            Environment.GetEnvironmentVariable("ConnectionStrings__AngelsLandingIdentityConnection")
            ?? Environment.GetEnvironmentVariable("ANGELSLANDING_IDENTITY_CONNECTION")
            ?? "Data Source=AngelsLandingIdentity.sqlite";

        var optionsBuilder = new DbContextOptionsBuilder<AuthIdentityDbContext>();
        var trimmed = cs.TrimStart();
        if (trimmed.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
        {
            optionsBuilder.UseSqlite(cs);
        }
        else
        {
            optionsBuilder.UseNpgsql(cs);
        }

        return new AuthIdentityDbContext(optionsBuilder.Options);
    }
}
