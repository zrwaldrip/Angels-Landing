using System.Globalization;
using System.Text.Json;

namespace AngelsLandingv2.API.Infrastructure;

public interface IForexRateService
{
    Task<ForexConversionResult> ConvertAsync(
        string fromCurrency,
        string toCurrency,
        double amount,
        CancellationToken cancellationToken = default);
}

public sealed class ForexConversionResult
{
    public required string FromCurrency { get; init; }
    public required string ToCurrency { get; init; }
    public required double Amount { get; init; }
    public required double ConvertedAmount { get; init; }
    public required double Rate { get; init; }
    public required string AsOfDate { get; init; }
}

public sealed class ForexRateService(HttpClient httpClient) : IForexRateService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private sealed class FrankfurterResponse
    {
        public double Amount { get; set; }
        public string? Base { get; set; }
        public string? Date { get; set; }
        public Dictionary<string, double>? Rates { get; set; }
    }

    public async Task<ForexConversionResult> ConvertAsync(
        string fromCurrency,
        string toCurrency,
        double amount,
        CancellationToken cancellationToken = default)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");

        var from = fromCurrency.Trim().ToUpperInvariant();
        var to = toCurrency.Trim().ToUpperInvariant();
        if (from == to)
        {
            return new ForexConversionResult
            {
                FromCurrency = from,
                ToCurrency = to,
                Amount = amount,
                ConvertedAmount = amount,
                Rate = 1,
                AsOfDate = DateTime.UtcNow.ToString("yyyy-MM-dd")
            };
        }

        var requestPath =
            $"latest?from={Uri.EscapeDataString(from)}&to={Uri.EscapeDataString(to)}&amount={amount.ToString(CultureInfo.InvariantCulture)}";

        using var response = await httpClient.GetAsync(requestPath, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Forex provider returned {(int)response.StatusCode}.");

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var payload = await JsonSerializer.DeserializeAsync<FrankfurterResponse>(stream, JsonOptions, cancellationToken);
        if (payload?.Rates is null || !payload.Rates.TryGetValue(to, out var convertedAmount))
            throw new InvalidOperationException("Forex provider response did not include requested currency.");

        return new ForexConversionResult
        {
            FromCurrency = from,
            ToCurrency = to,
            Amount = amount,
            ConvertedAmount = convertedAmount,
            Rate = convertedAmount / amount,
            AsOfDate = payload.Date ?? DateTime.UtcNow.ToString("yyyy-MM-dd")
        };
    }
}
