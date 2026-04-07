namespace AngelsLandingv2.API.Infrastructure;

/// <summary>
/// Explicit CORS for credentialed cross-origin requests. Use when platform CORS (e.g. Azure Portal)
/// conflicts with ASP.NET Core and strips Access-Control-Allow-Credentials.
/// </summary>
public static class ManualCorsMiddleware
{
    public static IApplicationBuilder UseManualCors(
        this IApplicationBuilder app,
        bool allowAnyOrigin,
        IReadOnlyList<string> allowedOrigins)
    {
        return app.Use(async (context, next) =>
        {
            var origin = context.Request.Headers.Origin.ToString();
            if (string.IsNullOrEmpty(origin))
            {
                await next();
                return;
            }

            var normalizedRequestOrigin = origin.TrimEnd('/');
            var allowed =
                allowAnyOrigin ||
                allowedOrigins.Any(o =>
                    string.Equals(o.TrimEnd('/'), normalizedRequestOrigin, StringComparison.OrdinalIgnoreCase));

            if (!allowed)
            {
                await next();
                return;
            }

            if (HttpMethods.IsOptions(context.Request.Method))
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = normalizedRequestOrigin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                context.Response.Headers["Access-Control-Allow-Methods"] =
                    "GET,POST,PUT,PATCH,DELETE,OPTIONS";
                var reqHeaders = context.Request.Headers["Access-Control-Request-Headers"].ToString();
                if (!string.IsNullOrEmpty(reqHeaders))
                {
                    context.Response.Headers["Access-Control-Allow-Headers"] = reqHeaders;
                }
                else
                {
                    context.Response.Headers["Access-Control-Allow-Headers"] =
                        "Content-Type,Authorization,X-Requested-With,X-XSRF-TOKEN";
                }

                context.Response.Headers["Access-Control-Max-Age"] = "86400";
                context.Response.Headers["Vary"] = "Origin";
                context.Response.StatusCode = StatusCodes.Status204NoContent;
                return;
            }

            context.Response.OnStarting(() =>
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = normalizedRequestOrigin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                context.Response.Headers["Vary"] = "Origin";
                return Task.CompletedTask;
            });

            await next();
        });
    }
}
