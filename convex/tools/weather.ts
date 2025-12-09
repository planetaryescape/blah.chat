"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const getWeather = internalAction({
  args: {
    city: v.string(),
    units: v.optional(v.union(v.literal("celsius"), v.literal("fahrenheit"))),
  },
  handler: async (ctx, { city, units = "celsius" }) => {
    try {
      // 1. Geocoding first to get coordinates for the city
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.searchParams.set("name", city);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "en");
      geoUrl.searchParams.set("format", "json");

      const geoRes = await fetch(geoUrl.toString());
      if (!geoRes.ok) throw new Error("Failed to geocode city");

      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        return {
          success: false,
          location: city,
          error: "City not found",
        };
      }

      const { latitude, longitude, name, country } = geoData.results[0];
      const locationName = `${name}, ${country}`;

      // 2. Fetch Weather Data
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", latitude.toString());
      url.searchParams.set("longitude", longitude.toString());
      url.searchParams.set("current_weather", "true");
      url.searchParams.set(
        "daily",
        "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum",
      );
      url.searchParams.set("temperature_unit", units);
      url.searchParams.set("timezone", "auto");
      url.searchParams.set("forecast_days", "3");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Weather API failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        location: locationName,
        units,
        current: {
          temperature: data.current_weather.temperature,
          windspeed: data.current_weather.windspeed,
          weathercode: data.current_weather.weathercode,
          time: data.current_weather.time,
        },
        forecast: {
          dates: data.daily.time,
          temperatureMax: data.daily.temperature_2m_max,
          temperatureMin: data.daily.temperature_2m_min,
          weathercodes: data.daily.weathercode,
          precipitation: data.daily.precipitation_sum,
        },
      };
    } catch (error) {
      return {
        success: false,
        location: city,
        error:
          error instanceof Error ? error.message : "Failed to fetch weather",
      };
    }
  },
});
