using AngelsLandingv2.API.Data;
using AngelsLandingv2.API.Data.Models;
using AngelsLandingv2.API.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController(
    LighthouseDbContext db,
    IForexRateService forexRateService,
    ILogger<DonationsController> logger) : ControllerBase
{
    private static readonly HashSet<string> AllowedDonationTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Monetary", "InKind", "Time", "Skills", "SocialMedia"
    };

    private static readonly HashSet<string> AllowedCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "USD", "PHP"
    };

    private static readonly HashSet<string> AllowedChannels = new(StringComparer.OrdinalIgnoreCase)
    {
        "Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"
    };

    private static readonly HashSet<string> AllowedCampaigns = new(StringComparer.OrdinalIgnoreCase)
    {
        "Year-End Hope", "GivingTuesday", "Summer of Safety", "Back to School"
    };

    public sealed class MyDonationCreateRequest
    {
        public double? Amount { get; set; }
        public string? CurrencyCode { get; set; }
        public bool? IsRecurring { get; set; }
        public string? CampaignName { get; set; }
        public string? Notes { get; set; }
    }

    [HttpGet]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? supporterId = null,
        [FromQuery] string? donationType = null)
    {
        var query = db.Donations.AsQueryable();
        if (supporterId.HasValue) query = query.Where(d => d.SupporterId == supporterId);
        if (!string.IsNullOrWhiteSpace(donationType)) query = query.Where(d => d.DonationType == donationType);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(d => d.DonationDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("mine")]
    [Authorize]
    public async Task<IActionResult> GetMine(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Signed-in account does not include an email claim." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var supporterIds = await db.Supporters
            .Where(s => s.Email != null && s.Email.Trim().ToLower() == normalizedEmail)
            .Select(s => s.SupporterId)
            .ToListAsync();

        var query = db.Donations
            .Where(d => d.SupporterId.HasValue && supporterIds.Contains(d.SupporterId.Value));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(d => d.DonationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpPost("mine")]
    [Authorize]
    public async Task<IActionResult> CreateMine([FromBody] MyDonationCreateRequest request)
    {
        if (request is null)
            return BadRequest(new { message = "Request body is required." });

        if (!request.Amount.HasValue || request.Amount <= 0)
            return BadRequest(new { message = "Donation amount must be greater than zero." });

        var currencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode)
            ? "PHP"
            : request.CurrencyCode.Trim().ToUpperInvariant();
        if (!AllowedCurrencies.Contains(currencyCode))
            return BadRequest(new { message = "Only USD and PHP are supported." });

        if (!string.IsNullOrWhiteSpace(request.CampaignName) && !AllowedCampaigns.Contains(request.CampaignName))
            return BadRequest(new { message = "Campaign name is invalid." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { message = "Signed-in account does not include an email claim." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var supporterId = await db.Supporters
            .Where(s => s.Email != null && s.Email.Trim().ToLower() == normalizedEmail)
            .OrderBy(s => s.SupporterId)
            .Select(s => (int?)s.SupporterId)
            .FirstOrDefaultAsync();

        if (!supporterId.HasValue)
        {
            var displayName = User.FindFirstValue(ClaimTypes.Name);
            if (string.IsNullOrWhiteSpace(displayName))
            {
                var atIndex = email.IndexOf('@');
                displayName = atIndex > 0 ? email[..atIndex] : email;
            }

            var firstName = displayName;
            var lastName = "Supporter";
            var nameParts = displayName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (nameParts.Length > 1)
            {
                firstName = nameParts[0];
                lastName = string.Join(' ', nameParts.Skip(1));
            }

            var newSupporter = new Supporter
            {
                SupporterType = "Individual",
                DisplayName = displayName,
                FirstName = string.IsNullOrWhiteSpace(firstName) ? "Donor" : firstName,
                LastName = string.IsNullOrWhiteSpace(lastName) ? "Supporter" : lastName,
                Region = "Unknown",
                Country = "Philippines",
                Email = email,
                Status = "Active",
                CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                AcquisitionChannel = "Direct"
            };

            try
            {
                db.Supporters.Add(newSupporter);
                await db.SaveChangesAsync();
                supporterId = newSupporter.SupporterId;
            }
            catch (DbUpdateException ex)
            {
                logger.LogError(ex, "Failed creating supporter record for email {Email}", email);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Unable to create supporter profile for this account. Please contact support."
                });
            }
        }

        var draft = new Donation
        {
            SupporterId = supporterId.Value,
            DonationType = "Monetary",
            IsRecurring = request.IsRecurring,
            CampaignName = request.CampaignName,
            CurrencyCode = currencyCode,
            Amount = request.Amount,
            Notes = request.Notes
        };

        var normalizeResult = await ValidateAndNormalizeDonationAsync(
            draft,
            forceDirectChannel: true,
            forceTodayDate: true,
            HttpContext.RequestAborted);
        if (normalizeResult.error is not null) return normalizeResult.error;
        var donation = normalizeResult.donation!;

        try
        {
            db.Donations.Add(donation);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            logger.LogError(ex, "Failed creating donation for supporterId {SupporterId}", supporterId.Value);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Unable to save donation at this time. Please try again."
            });
        }
        return Ok(donation);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await db.Donations.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Create([FromBody] Donation donation)
    {
        var normalizeResult = await ValidateAndNormalizeDonationAsync(
            donation,
            forceDirectChannel: false,
            forceTodayDate: false,
            HttpContext.RequestAborted);
        if (normalizeResult.error is not null) return normalizeResult.error;

        db.Donations.Add(normalizeResult.donation!);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = normalizeResult.donation!.DonationId }, normalizeResult.donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Update(int id, [FromBody] Donation donation)
    {
        if (id != donation.DonationId) return BadRequest();

        var normalizeResult = await ValidateAndNormalizeDonationAsync(
            donation,
            forceDirectChannel: false,
            forceTodayDate: false,
            HttpContext.RequestAborted);
        if (normalizeResult.error is not null) return normalizeResult.error;

        db.Entry(normalizeResult.donation!).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.ManageCatalog)]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await db.Donations.FindAsync(id);
        if (item is null) return NotFound();
        db.Donations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<(Donation? donation, IActionResult? error)> ValidateAndNormalizeDonationAsync(
        Donation input,
        bool forceDirectChannel,
        bool forceTodayDate,
        CancellationToken cancellationToken)
    {
        if (!input.SupporterId.HasValue || input.SupporterId.Value <= 0)
            return (null, BadRequest(new { message = "Supporter is required." }));

        var donationType = input.DonationType?.Trim();
        if (string.IsNullOrWhiteSpace(donationType) || !AllowedDonationTypes.Contains(donationType))
            return (null, BadRequest(new { message = "Donation type is invalid." }));

        var channel = forceDirectChannel ? "Direct" : input.ChannelSource?.Trim();
        if (string.IsNullOrWhiteSpace(channel) || !AllowedChannels.Contains(channel))
            return (null, BadRequest(new { message = "Channel source is invalid." }));

        var campaign = input.CampaignName?.Trim();
        if (!string.IsNullOrWhiteSpace(campaign) && !AllowedCampaigns.Contains(campaign))
            return (null, BadRequest(new { message = "Campaign name is invalid." }));

        var donationDate = forceTodayDate ? DateTime.UtcNow.ToString("yyyy-MM-dd") : input.DonationDate?.Trim();
        if (string.IsNullOrWhiteSpace(donationDate))
            return (null, BadRequest(new { message = "Donation date is required." }));
        if (!DateOnly.TryParse(donationDate, out _))
            return (null, BadRequest(new { message = "Donation date must be a valid date." }));

        var normalized = new Donation
        {
            DonationId = input.DonationId,
            SupporterId = input.SupporterId,
            DonationType = donationType,
            DonationDate = donationDate,
            IsRecurring = input.IsRecurring,
            CampaignName = string.IsNullOrWhiteSpace(campaign) ? null : campaign,
            ChannelSource = channel,
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
            ReferralPostId = input.ReferralPostId
        };

        if (string.Equals(donationType, "Monetary", StringComparison.OrdinalIgnoreCase))
        {
            if (!input.Amount.HasValue || input.Amount.Value <= 0)
                return (null, BadRequest(new { message = "Monetary donation amount must be greater than zero." }));

            var currencyCode = string.IsNullOrWhiteSpace(input.CurrencyCode)
                ? "PHP"
                : input.CurrencyCode.Trim().ToUpperInvariant();
            if (!AllowedCurrencies.Contains(currencyCode))
                return (null, BadRequest(new { message = "Only USD and PHP are supported." }));

            double phpEquivalent;
            if (currencyCode == "PHP")
            {
                phpEquivalent = input.Amount.Value;
            }
            else
            {
                try
                {
                    var conversion = await forexRateService.ConvertAsync("USD", "PHP", input.Amount.Value, cancellationToken);
                    phpEquivalent = conversion.ConvertedAmount;
                }
                catch (InvalidOperationException ex)
                {
                    return (null, StatusCode(StatusCodes.Status502BadGateway, new { message = $"Unable to fetch live forex rate: {ex.Message}" }));
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Unexpected forex conversion failure for donation.");
                    return (null, StatusCode(StatusCodes.Status502BadGateway, new { message = "Unable to fetch live forex rate right now. Please try again." }));
                }
            }

            normalized.CurrencyCode = currencyCode;
            normalized.Amount = input.Amount.Value;
            normalized.EstimatedValue = phpEquivalent;
            normalized.ImpactUnit = "pesos";
            return (normalized, null);
        }

        var nonMonetaryValue = input.EstimatedValue ?? input.Amount;
        if (!nonMonetaryValue.HasValue || nonMonetaryValue.Value <= 0)
            return (null, BadRequest(new { message = "Non-monetary donation estimated value must be greater than zero." }));

        normalized.CurrencyCode = null;
        normalized.Amount = null;
        normalized.EstimatedValue = nonMonetaryValue.Value;
        normalized.ImpactUnit = string.Equals(donationType, "InKind", StringComparison.OrdinalIgnoreCase)
            ? "items"
            : string.Equals(donationType, "SocialMedia", StringComparison.OrdinalIgnoreCase)
                ? "campaigns"
                : "hours";
        return (normalized, null);
    }
}
