using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AngelsLandingv2.API.Data;

/// <summary>
/// Used by EF Core tools (dotnet ef migrations) at design time.
/// Set ConnectionStrings__LighthouseConnection to a Postgres connection string for Npgsql migrations,
/// or leave unset to default to SQLite locally.
/// </summary>
public sealed class LighthouseDbContextFactory : IDesignTimeDbContextFactory<LighthouseDbContext>
{
    public LighthouseDbContext CreateDbContext(string[] args)
    {
        var cs =
            Environment.GetEnvironmentVariable("ConnectionStrings__LighthouseConnection")
            ?? "Data Source=AngelsLandingv2.sqlite";

        var optionsBuilder = new DbContextOptionsBuilder<LighthouseDbContext>();
        if (cs.TrimStart().StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
            optionsBuilder.UseSqlite(cs);
        else
            optionsBuilder.UseNpgsql(cs);

        return new LighthouseDbContext(optionsBuilder.Options);
    }
}
