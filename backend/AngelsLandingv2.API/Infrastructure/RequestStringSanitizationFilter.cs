using System.Collections;
using System.Net;
using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AngelsLandingv2.API.Infrastructure;

public sealed class RequestStringSanitizationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var request = context.HttpContext.Request;
        if (!HttpMethods.IsPost(request.Method) && !HttpMethods.IsPut(request.Method)) return;

        var visited = new HashSet<object>(ReferenceEqualityComparer.Instance);
        var keys = context.ActionArguments.Keys.ToArray();
        foreach (var key in keys)
        {
            context.ActionArguments[key] = SanitizeObject(context.ActionArguments[key], visited);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }

    private static object? SanitizeObject(object? value, HashSet<object> visited)
    {
        if (value is null) return null;

        if (value is string text)
        {
            return SanitizeString(text);
        }

        var type = value.GetType();
        if (type.IsPrimitive || type.IsEnum || type == typeof(decimal) || type == typeof(DateTime) || type == typeof(DateTimeOffset) || type == typeof(Guid) || type == typeof(TimeSpan))
        {
            return value;
        }

        if (!type.IsValueType)
        {
            if (!visited.Add(value)) return value;
        }

        if (value is IDictionary dictionary)
        {
            foreach (DictionaryEntry entry in dictionary)
            {
                if (entry.Key is null) continue;
                var sanitizedValue = SanitizeObject(entry.Value, visited);
                dictionary[entry.Key] = sanitizedValue;
            }
            return value;
        }

        if (value is IList list)
        {
            for (var i = 0; i < list.Count; i++)
            {
                list[i] = SanitizeObject(list[i], visited);
            }
            return value;
        }

        foreach (var property in type.GetProperties(System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public))
        {
            if (!property.CanRead) continue;

            if (property.PropertyType == typeof(string))
            {
                if (!property.CanWrite) continue;
                var original = property.GetValue(value) as string;
                if (original is null) continue;
                var sanitized = SanitizeString(original);
                if (!ReferenceEquals(original, sanitized) && !string.Equals(original, sanitized, StringComparison.Ordinal))
                {
                    property.SetValue(value, sanitized);
                }
                continue;
            }

            var nested = property.GetValue(value);
            if (nested is null) continue;
            SanitizeObject(nested, visited);
        }

        return value;
    }

    private static string SanitizeString(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;

        if (input.IndexOf('<') < 0 && input.IndexOf('>') < 0)
        {
            return input;
        }

        return WebUtility.HtmlEncode(input);
    }

    private sealed class ReferenceEqualityComparer : IEqualityComparer<object>
    {
        public static ReferenceEqualityComparer Instance { get; } = new();

        public new bool Equals(object? x, object? y) => ReferenceEquals(x, y);

        public int GetHashCode(object obj) => RuntimeHelpers.GetHashCode(obj);
    }
}