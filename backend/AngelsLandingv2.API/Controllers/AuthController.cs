using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using AngelsLandingv2.API.Data;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IConfiguration configuration) : ControllerBase
{
    private const string DefaultFrontendUrl = "http://localhost:3000";
    private const string DefaultExternalReturnPath = "/residents";

    public sealed class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public string? TwoFactorCode { get; set; }

        public string? TwoFactorRecoveryCode { get; set; }
    }

    [HttpPost("login")]
    [HttpPost("login-detailed")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromQuery] bool? useCookies = null,
        [FromQuery] bool? useSessionCookies = null,
        [FromQuery] bool? useCookie = null)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var user = await userManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return Unauthorized(new { message = "No account exists for that email address." });
        }

        var isPersistent = useCookies == true || useCookie == true;
        if (useSessionCookies == true) isPersistent = false;

        if (!await signInManager.CanSignInAsync(user))
        {
            return Unauthorized(new { message = "This account is not allowed to sign in." });
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            return Unauthorized(new { message = "This account is locked out due to too many failed attempts. Try again later." });
        }

        var passwordIsValid = await userManager.CheckPasswordAsync(user, request.Password);

        if (!passwordIsValid)
        {
            await userManager.AccessFailedAsync(user);

            if (await userManager.IsLockedOutAsync(user))
            {
                return Unauthorized(new { message = "This account is locked out due to too many failed attempts. Try again later." });
            }

            return Unauthorized(new { message = "The password is incorrect." });
        }

        if (user.TwoFactorEnabled)
        {
            var hasAuthenticatorCode = !string.IsNullOrWhiteSpace(request.TwoFactorCode);
            var hasRecoveryCode = !string.IsNullOrWhiteSpace(request.TwoFactorRecoveryCode);

            if (!hasAuthenticatorCode && !hasRecoveryCode)
            {
                return Unauthorized(new { message = "MFA is enabled for this account. Provide an authenticator or recovery code." });
            }

            if (hasAuthenticatorCode)
            {
                var normalizedCode = request.TwoFactorCode!.Replace(" ", string.Empty).Replace("-", string.Empty);
                var tokenIsValid = await userManager.VerifyTwoFactorTokenAsync(
                    user, TokenOptions.DefaultAuthenticatorProvider, normalizedCode);

                if (!tokenIsValid)
                {
                    await userManager.AccessFailedAsync(user);
                    if (await userManager.IsLockedOutAsync(user))
                    {
                        return Unauthorized(new { message = "This account is locked out due to too many failed attempts. Try again later." });
                    }
                    return Unauthorized(new { message = "The authenticator code is invalid." });
                }
            }
            else
            {
                var recoveryResult = await userManager.RedeemTwoFactorRecoveryCodeAsync(user, request.TwoFactorRecoveryCode!);
                if (!recoveryResult.Succeeded)
                {
                    await userManager.AccessFailedAsync(user);
                    if (await userManager.IsLockedOutAsync(user))
                    {
                        return Unauthorized(new { message = "This account is locked out due to too many failed attempts. Try again later." });
                    }
                    return Unauthorized(new { message = "The recovery code is invalid." });
                }
            }
        }

        await userManager.ResetAccessFailedCountAsync(user);
        await signInManager.SignInAsync(user, isPersistent);

        return Ok(new { message = "Login successful." });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Ok(new
            {
                isAuthenticated = false,
                userName = (string?)null,
                email = (string?)null,
                roles = Array.Empty<string>()
            });
        }

        var user = await userManager.GetUserAsync(User);
        var identityName = User.Identity?.Name;
        if (user is null && !string.IsNullOrWhiteSpace(identityName))
        {
            user = await userManager.FindByNameAsync(identityName)
                ?? await userManager.FindByEmailAsync(identityName);
        }

        var roles = user is not null
            ? (await userManager.GetRolesAsync(user))
                .Distinct()
                .OrderBy(role => role)
                .ToArray()
            : User.Claims
                .Where(claim => claim.Type == ClaimTypes.Role || claim.Type.Equals("role", StringComparison.OrdinalIgnoreCase))
                .Select(claim => claim.Value)
                .Distinct()
                .OrderBy(role => role)
                .ToArray();

        var email = user?.Email
            ?? User.Claims.FirstOrDefault(claim => claim.Type == ClaimTypes.Email)?.Value
            ?? identityName;

        var userName = user?.UserName
            ?? identityName
            ?? email;

        return Ok(new
        {
            isAuthenticated = true,
            userName,
            email,
            roles
        });
    }

    [HttpGet("providers")]
    public IActionResult GetExternalProviders()
    {
        // Google OAuth is not configured by default; returns empty list
        return Ok(new List<object>());
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(IdentityConstants.ApplicationScheme);
        await HttpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        await HttpContext.SignOutAsync(IdentityConstants.TwoFactorRememberMeScheme);
        await HttpContext.SignOutAsync(IdentityConstants.TwoFactorUserIdScheme);
        await signInManager.SignOutAsync();

        ExpireIdentityCookie(".AspNetCore.Identity.Application");
        ExpireIdentityCookie(".AspNetCore.Identity.External");
        ExpireIdentityCookie(".AspNetCore.Identity.TwoFactorRememberMe");
        ExpireIdentityCookie(".AspNetCore.Identity.TwoFactorUserId");

        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        return Ok(new { message = "Logout successful." });
    }

    private void ExpireIdentityCookie(string cookieName)
    {
        if (!Request.Cookies.ContainsKey(cookieName))
            return;

        Response.Cookies.Append(cookieName, string.Empty, new CookieOptions
        {
            Expires = DateTimeOffset.UnixEpoch,
            MaxAge = TimeSpan.Zero,
            Path = "/",
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None
        });
    }

    private string BuildFrontendErrorUrl(string errorMessage)
    {
        var frontendUrl = configuration["FrontendUrl"] ?? DefaultFrontendUrl;
        var loginUrl = $"{frontendUrl.TrimEnd('/')}/login";
        return QueryHelpers.AddQueryString(loginUrl, "externalError", errorMessage);
    }
}
