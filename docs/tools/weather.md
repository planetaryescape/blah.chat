# Weather Tool

## Overview

Get current weather and forecasts for any location. Simple, high-utility tool.

---

## Priority

**🟢 OPTIONAL** - Nice to have, but web search can cover this.

---

## Use Cases

- "What's the weather in San Francisco?"
- "Will it rain tomorrow?"
- "What should I wear today?"
- "Temperature in Tokyo this weekend"

---

## API Recommendations

### Option 1: OpenWeatherMap

| Feature | Value |
|---------|-------|
| Pricing | Free: 1,000/day, $40/mo for 100k |
| Coverage | Global |
| Data | Current, forecast, historical |

```bash
OPENWEATHERMAP_API_KEY=...
```

### Option 2: Open-Meteo (Free)

| Feature | Value |
|---------|-------|
| Pricing | **Free**, no API key |
| Coverage | Global |
| Data | Current, 7-day forecast |

**Recommended** - No API key needed, reliable.

---

## Implementation Complexity

**⚡ LOW** - 1-2 hours

---

## Tool Schema

```typescript
inputSchema: z.object({
  location: z.string().describe("City name or coordinates"),
  units: z.enum(["metric", "imperial"]).optional().default("metric"),
})
```

---

## Note

Consider if this is worth implementing separately vs. using web search tool.
