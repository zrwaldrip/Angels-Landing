using System.Reflection;
using Npgsql;
using Microsoft.EntityFrameworkCore;
using AngelsLandingv2.API.Data;
using Microsoft.AspNetCore.Identity;
using AngelsLandingv2.API.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
// Load user secrets even when ASPNETCORE_ENVIRONMENT is not explicitly set (common in some IDEs)
builder.Configuration.AddUserSecrets(Assembly.GetExecutingAssembly(), optional: true);

const string DefaultFrontendUrl = "http://localhost:3000";
var frontendUrl = builder.Configuration["FrontendUrl"] ?? DefaultFrontendUrl;
var allowAnyOrigin = string.Equals(
    builder.Configuration["Cors:AllowAnyOrigin"],
    "true",
    StringComparison.OrdinalIgnoreCase);

var corsAllowedOriginsRaw = builder.Configuration["Cors:AllowedOrigins"];
var corsOrigins = new List<string>();
if (!string.IsNullOrWhiteSpace(corsAllowedOriginsRaw))
{
    foreach (var part in corsAllowedOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        corsOrigins.Add(part.TrimEnd('/'));
    }
}

if (corsOrigins.Count == 0 && !string.IsNullOrWhiteSpace(frontendUrl))
    corsOrigins.Add(frontendUrl.TrimEnd('/'));

if (corsOrigins.Count == 0)
    corsOrigins.Add(DefaultFrontendUrl);

var needsCrossSiteAuthCookies =
    allowAnyOrigin ||
    corsOrigins.Exists(static o => o.StartsWith("https://", StringComparison.OrdinalIgnoreCase));

// ─── Helpers ─────────────────────────────────────────────────────────────────

static string EnsureAzureWritableSqlite(string? configuredConnectionString, string fallbackFileName)
{
    var conn = configuredConnectionString;
    if (string.IsNullOrWhiteSpace(conn))
        conn = $"Data Source={fallbackFileName}";

    const string DataSourcePrefix = "Data Source=";
    if (!conn.TrimStart().StartsWith(DataSourcePrefix, StringComparison.OrdinalIgnoreCase))
        return conn;

    var ds = conn.Trim()[DataSourcePrefix.Length..].Trim().Trim('"');
    var isPathRooted = Path.IsPathRooted(ds) || ds.StartsWith("/", StringComparison.Ordinal);
    // Azure App Service sets WEBSITE_INSTANCE_ID; HOME alone is not sufficient (also present on macOS/Linux dev machines)
    var runningInAzure = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID"));

    if (!runningInAzure || isPathRooted) return conn;

    var home = Environment.GetEnvironmentVariable("HOME");
    var dbDir = Path.Combine(home ?? "/home", "site", "data");
    Directory.CreateDirectory(dbDir);
    var dbPath = Path.Combine(dbDir, Path.GetFileName(ds));
    return $"{DataSourcePrefix}{dbPath}";
}

static bool IsSqliteConnectionString(string conn) =>
    conn.TrimStart().StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase);

static string ParseSqlitePathFromConnectionString(string conn)
{
    const string prefix = "Data Source=";
    var t = conn.Trim();
    if (!t.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return string.Empty;
    var rest = t[prefix.Length..].Trim();
    return rest.Length >= 2 && rest[0] == '"' && rest[^1] == '"' ? rest[1..^1] : rest;
}

static string MaybeRewriteSupabaseDirectToSessionPooler(string connectionString, IConfiguration configuration)
{
    var usePooler = string.Equals(configuration["Supabase:UseSessionPooler"], "true", StringComparison.OrdinalIgnoreCase);
    if (!usePooler) return connectionString;

    var region = configuration["Supabase:AwsRegion"]?.Trim();
    if (string.IsNullOrEmpty(region)) return connectionString;

    NpgsqlConnectionStringBuilder csBuilder;
    try { csBuilder = new NpgsqlConnectionStringBuilder(connectionString); }
    catch { return connectionString; }

    var host = csBuilder.Host;
    if (string.IsNullOrEmpty(host)) return connectionString;

    const string prefix = "db.";
    const string suffix = ".supabase.co";
    if (!host.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
        !host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        return connectionString;

    var projectRef = host[prefix.Length..^suffix.Length];
    if (string.IsNullOrEmpty(projectRef)) return connectionString;

    csBuilder.Host = $"aws-0-{region}.pooler.supabase.com";
    csBuilder.Username = $"postgres.{projectRef}";
    csBuilder.Port = csBuilder.Port == 0 ? 5432 : csBuilder.Port;
    return csBuilder.ConnectionString;
}

static string GetForcedLocalSqliteIdentityConnectionString(IConfiguration configuration)
{
    var raw = configuration["LocalDevelopment:IdentitySqliteConnection"];
    if (string.IsNullOrWhiteSpace(raw)) raw = "Data Source=AngelsLandingIdentity.sqlite";
    return EnsureAzureWritableSqlite(raw.Trim(), "AngelsLandingIdentity.sqlite");
}

static string ResolveIdentityConnectionString(IConfiguration configuration)
{
    if (string.Equals(configuration["LocalDevelopment:UseSqliteIdentity"], "true", StringComparison.OrdinalIgnoreCase))
        return GetForcedLocalSqliteIdentityConnectionString(configuration);

    var conn = configuration.GetConnectionString("AngelsLandingIdentityConnection");
    if (string.IsNullOrWhiteSpace(conn))
    {
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "(not set)";
        throw new InvalidOperationException(
            $"ConnectionStrings:AngelsLandingIdentityConnection is empty. ASPNETCORE_ENVIRONMENT={env}. " +
            "For local dev: set LocalDevelopment:UseSqliteIdentity to true in appsettings.Development.json.");
    }

    conn = conn.Trim();
    return IsSqliteConnectionString(conn)
        ? EnsureAzureWritableSqlite(conn, "AngelsLandingIdentity.sqlite")
        : MaybeRewriteSupabaseDirectToSessionPooler(conn, configuration);
}

// ─── Service Registration ─────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Identity database
var identityConnectionString = ResolveIdentityConnectionString(builder.Configuration);
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
{
    if (IsSqliteConnectionString(identityConnectionString))
        options.UseSqlite(identityConnectionString);
    else
        options.UseNpgsql(identityConnectionString);
});

// Lighthouse data database
var lighthouseRaw = builder.Configuration.GetConnectionString("LighthouseConnection");
var lighthouseConn = EnsureAzureWritableSqlite(lighthouseRaw, "AngelsLandingv2.sqlite");
builder.Services.AddDbContext<LighthouseDbContext>(options =>
{
    if (IsSqliteConnectionString(lighthouseConn))
        options.UseSqlite(lighthouseConn);
    else
        options.UseNpgsql(MaybeRewriteSupabaseDirectToSessionPooler(lighthouseConn, builder.Configuration));
});

builder.Services.AddIdentityApiEndpoints<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AuthIdentityDbContext>();

// Google OAuth: add ClientId/ClientSecret via user-secrets or appsettings to enable
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!string.IsNullOrEmpty(googleClientId) && !string.IsNullOrEmpty(googleClientSecret))
{
    builder.Services.AddAuthentication()
        .AddGoogle(options =>
        {
            options.ClientId = googleClientId;
            options.ClientSecret = googleClientSecret;
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.CallbackPath = "/signin-google";
        });
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.ManageCatalog, policy => policy.RequireRole(AuthRoles.Admin));
});

builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequiredLength = 14;
    options.Password.RequiredUniqueChars = 1;
});

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = needsCrossSiteAuthCookies ? SameSiteMode.None : SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

// ─── App Pipeline ─────────────────────────────────────────────────────────────

var app = builder.Build();

// Initialize databases and seed
using (var scope = app.Services.CreateScope())
{
    // Identity DB
    var authDb = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();
    var identityConn = ResolveIdentityConnectionString(app.Configuration);
    if (IsSqliteConnectionString(identityConn))
        await authDb.Database.EnsureCreatedAsync();
    else
        await authDb.Database.MigrateAsync();

    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(scope.ServiceProvider, app.Configuration);

    // Lighthouse data DB
    var lighthouseDb = scope.ServiceProvider.GetRequiredService<LighthouseDbContext>();
    if (IsSqliteConnectionString(lighthouseConn))
        await lighthouseDb.Database.EnsureCreatedAsync();
    else
        await lighthouseDb.Database.MigrateAsync();

    // Seed from CSVs
    var dataFolder = Path.Combine(AppContext.BaseDirectory, "SeedData");
    if (!Directory.Exists(dataFolder))
        dataFolder = Path.Combine(Directory.GetCurrentDirectory(), "SeedData");

    await CsvSeedingService.SeedAllAsync(lighthouseDb, dataFolder);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseManualCors(allowAnyOrigin, corsOrigins);
app.UseSecurityHeaders();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();
app.Run();
