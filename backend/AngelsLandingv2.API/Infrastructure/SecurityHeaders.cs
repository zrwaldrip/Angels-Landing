namespace AngelsLandingv2.API.Infrastructure
{
    public static class SecurityHeaders
    {
        public const string ContentSecurityPolicy = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:";

        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
        {
            var environment = app.ApplicationServices.GetRequiredService<IWebHostEnvironment>();
            return app.Use(async (context, next) =>
            {
                context.Response.OnStarting(() =>
                {
                    if (!(environment.IsDevelopment() && context.Request.Path.StartsWithSegments("/swagger")))
                    {
                        context.Response.Headers["Content-Security-Policy"] = ContentSecurityPolicy;
                    }

                    return Task.CompletedTask;
                });
                await next();
            });
        }
    }
}
