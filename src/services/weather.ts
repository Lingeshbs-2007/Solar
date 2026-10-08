import { calculateSolarForecast, generateDeterministicSolarProfile, RawHourlyWeatherData } from '../engines/solarForecast';
import { SolarForecastResult } from '../models/forecast';
import { LocationInfo } from '../models/household';

/**
 * Fetches next-day hourly solar weather data from Open-Meteo or falls back deterministically.
 */
export async function getSolarForecastForHousehold(
  location: LocationInfo,
  panelCapacityKW: number,
  targetDate?: string
): Promise<SolarForecastResult> {
  const tomorrow = targetDate || getTomorrowISOString();

  try {
    // Open-Meteo free solar radiation API endpoint
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=direct_normal_irradiance,diffuse_radiation,shortwave_radiation_instant,cloud_cover,temperature_2m&forecast_days=2&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Weather API returned status: ${response.status}`);
    }

    const data = await response.json();
    const hourlyTimes: string[] = data.hourly?.time || [];
    const dni: number[] = data.hourly?.direct_normal_irradiance || [];
    const dhi: number[] = data.hourly?.diffuse_radiation || [];
    const ghi: number[] = data.hourly?.shortwave_radiation_instant || [];
    const clouds: number[] = data.hourly?.cloud_cover || [];
    const temps: number[] = data.hourly?.temperature_2m || [];

    // Filter points for target tomorrow date
    const tomorrowIndices: number[] = [];
    hourlyTimes.forEach((timeStr, idx) => {
      if (timeStr.startsWith(tomorrow)) {
        tomorrowIndices.push(idx);
      }
    });

    // If matching date found (24 hours)
    if (tomorrowIndices.length >= 24) {
      const rawWeather: RawHourlyWeatherData[] = tomorrowIndices.slice(0, 24).map((idx, h) => ({
        hour: h,
        directNormalIrradiance: dni[idx] || 0,
        diffuseIrradiance: dhi[idx] || 0,
        shortwaveRadiation: ghi[idx] || 0,
        cloudCoverPct: clouds[idx] || 0,
        temperatureC: temps[idx] || 25,
      }));

      return calculateSolarForecast(location, panelCapacityKW, rawWeather, tomorrow, false);
    }

    // Fallback if index mismatch
    const fallbackData = generateDeterministicSolarProfile(location, tomorrow);
    return calculateSolarForecast(location, panelCapacityKW, fallbackData, tomorrow, true);
  } catch {
    // Deterministic fallback ensures the application is NEVER unusable
    const fallbackData = generateDeterministicSolarProfile(location, tomorrow);
    return calculateSolarForecast(location, panelCapacityKW, fallbackData, tomorrow, true);
  }
}

function getTomorrowISOString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
