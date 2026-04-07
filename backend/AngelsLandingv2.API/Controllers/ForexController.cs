using AngelsLandingv2.API.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace AngelsLandingv2.API.Controllers;

[ApiController]
[Route("api/forex")]
public class ForexController(IForexRateService forexRateService) : ControllerBase
{
    private static readonly HashSet<string> AllowedCurrencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "USD", "PHP"
    };

    [HttpGet("convert")]
    public async Task<IActionResult> Convert(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] double amount = 1,
        CancellationToken cancellationToken = default)
    {
        if (amount <= 0) return BadRequest(new { message = "Amount must be greater than zero." });
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Both from and to currency are required." });
        if (!AllowedCurrencies.Contains(from) || !AllowedCurrencies.Contains(to))
            return BadRequest(new { message = "Only USD and PHP are supported." });

        try
        {
            var result = await forexRateService.ConvertAsync(from, to, amount, cancellationToken);
            return Ok(new
            {
                fromCurrency = result.FromCurrency,
                toCurrency = result.ToCurrency,
                amount = result.Amount,
                convertedAmount = result.ConvertedAmount,
                rate = result.Rate,
                asOfDate = result.AsOfDate,
                provider = "frankfurter.app"
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = $"Unable to fetch live forex rate: {ex.Message}" });
        }
    }
}
