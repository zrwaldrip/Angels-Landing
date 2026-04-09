using System.Reflection;
using Npgsql;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Data.Sqlite;
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

// Cross-site auth cookies (SameSite=None) are only safe when requests are over HTTPS.
// In local HTTP development, using None causes the browser to reject the cookie unless Secure=true.
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

static async Task EnsureSqliteColumnExistsAsync(DbContext db, string tableName, string columnName, string columnTypeDefinition)
{
    // Check existence first via PRAGMA so we never attempt ALTER TABLE on an existing column.
    // The old try/catch approach worked but caused EF Core to log a noisy red [20102] command
    // failure on every startup for each column that was already present.
    var conn = (SqliteConnection)db.Database.GetDbConnection();
    var wasOpen = conn.State == System.Data.ConnectionState.Open;
    if (!wasOpen) await conn.OpenAsync();
    try
    {
        using var checkCmd = conn.CreateCommand();
        checkCmd.CommandText = $"SELECT COUNT(*) FROM pragma_table_info(\"{tableName}\") WHERE name = \"{columnName}\";";
        var count = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L);
        if (count == 0)
        {
            using var alterCmd = conn.CreateCommand();
            alterCmd.CommandText = $"ALTER TABLE \"{tableName}\" ADD COLUMN \"{columnName}\" {columnTypeDefinition};";
            await alterCmd.ExecuteNonQueryAsync();
        }
    }
    finally
    {
        if (!wasOpen) conn.Close();
    }
}

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
builder.Services.AddHttpClient<IForexRateService, ForexRateService>(client =>
{
    client.BaseAddress = new Uri("https://api.frankfurter.app/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

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

    // Schema is managed manually via SQL scripts (not EF migrations), so suppress this warning
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
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
        Console.WriteLine("Bypassing Auth MigrateAsync to prevent Azure Crash.");

    await AuthIdentityGenerator.GenerateDefaultIdentityAsync(scope.ServiceProvider, app.Configuration);

    // Lighthouse data DB
    var lighthouseDb = scope.ServiceProvider.GetRequiredService<LighthouseDbContext>();
    if (IsSqliteConnectionString(lighthouseConn))
    {
        await lighthouseDb.Database.EnsureCreatedAsync();
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "Residents", "MlPredictionStatus", "TEXT NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "Residents", "MlLastCalculated", "TEXT NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "Campaigns", "RecurringRate", "REAL NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "Campaigns", "TopChannel", "TEXT NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "Campaigns", "MlrSignificant", "INTEGER NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "SocialMediaPosts", "PredictedEngagementRate", "REAL NULL");
        await EnsureSqliteColumnExistsAsync(lighthouseDb, "SocialMediaPosts", "EngagementScoredAt", "TEXT NULL");

        // Create FeatureImportances table if it doesn't exist yet
        await lighthouseDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""FeatureImportances"" (
                ""Id""           INTEGER PRIMARY KEY AUTOINCREMENT,
                ""Feature""      TEXT NULL,
                ""Importance""   REAL NOT NULL DEFAULT 0,
                ""CalculatedAt"" TEXT NULL
            );");

        await lighthouseDb.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""SocialEngagementInsights"" (
                ""SocialEngagementInsightId"" INTEGER PRIMARY KEY AUTOINCREMENT,
                ""FactorKey"" TEXT NULL,
                ""DisplayName"" TEXT NULL,
                ""Coefficient"" REAL NULL,
                ""PValue"" REAL NULL,
                ""RankOrder"" INTEGER NULL,
                ""ComputedAt"" TEXT NULL,
                ""ModelVersion"" TEXT NULL
            );");
    }
    else
        Console.WriteLine("Bypassing Lighthouse MigrateAsync to prevent Azure Crash.");

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
