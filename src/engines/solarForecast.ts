import { HourlyForecastPoint, SolarForecastResult, UsefulSolarWindow } from '../models/forecast';
import { LocationInfo } from '../models/household';

export interface RawHourlyWeatherData {
  hour: number;
  directNormalIrradiance?: number; // W/m²
  diffuseIrradiance?: number;      // W/m²
  shortwaveRadiation?: number;     // W/m²
  cloudCoverPct: number;           // 0-100
  temperatureC?: number;
}

/**
 * Calculates solar elevation angle in degrees for a given latitude, day of year, and hour.
 */
function calculateSunElevation(latitude: number, dayOfYear: number, hour: number): number {
  // Approximate solar declination (Cooper's equation)
  const declination = 23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear));
  const declRad = (declination * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // Solar hour angle (15 degrees per hour from solar noon at 12:00)
  const hourAngle = (hour - 12) * 15;
  const hourAngleRad = (hourAngle * Math.PI) / 180;

  // Solar elevation angle sine
  const sinElevation = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);
  const elevationDeg = (Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180) / Math.PI;

  return Math.max(0, elevationDeg);
}

/**
 * Generates deterministic fallback solar weather profile when external weather API is unavailable or offline.
 */
export function generateDeterministicSolarProfile(
  location: LocationInfo,
  dateStr: string
): RawHourlyWeatherData[] {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const result: RawHourlyWeatherData[] = [];

  // Deterministic slight seasonal and location variation
  // Tropical/sunny latitude gets clearer skies on average
  const latAbs = Math.abs(location.latitude);
  const baseCloudCover = latAbs < 20 ? 18 : latAbs < 35 ? 24 : 38;

  for (let h = 0; h < 24; h++) {
    const elevation = calculateSunElevation(location.latitude, dayOfYear, h + 0.5);

    if (elevation <= 2) {
      // Night / pre-dawn
      result.push({
        hour: h,
        directNormalIrradiance: 0,
        diffuseIrradiance: 0,
        shortwaveRadiation: 0,
        cloudCoverPct: baseCloudCover,
        temperatureC: 22,
      });
      continue;
    }

    // Solar irradiance model (Haurwitz clear-sky / ASHRAE approximation)
    // Irradiance peaks at solar noon
    const airMass = 1 / (Math.sin((elevation * Math.PI) / 180) + 0.001);
    const clearSkyDirect = 1000 * Math.exp(-0.21 * Math.min(airMass, 10)) * Math.sin((elevation * Math.PI) / 180);
    const clearSkyDiffuse = 120 * Math.sin((elevation * Math.PI) / 180);

    // Midday cloud pattern simulation (mild thermal cumulus in afternoon around 13:00 - 15:00)
    let cloud = baseCloudCover;
    if (h >= 13 && h <= 15) {
      cloud += 12; // slight afternoon convective cloud
    }

    const cloudFraction = cloud / 100;
    const adjustedDirect = clearSkyDirect * (1 - 0.75 * Math.pow(cloudFraction, 1.8));
    const adjustedDiffuse = clearSkyDiffuse * (1 - 0.25 * cloudFraction) + clearSkyDirect * 0.2 * cloudFraction;
    const totalGHI = Math.max(0, adjustedDirect + adjustedDiffuse);

    result.push({
      hour: h,
      directNormalIrradiance: Math.round(adjustedDirect),
      diffuseIrradiance: Math.round(adjustedDiffuse),
      shortwaveRadiation: Math.round(totalGHI),
      cloudCoverPct: Math.round(cloud),
      temperatureC: 24 + Math.sin(((h - 8) / 12) * Math.PI) * 7,
    });
  }

  return result;
}

/**
 * Core Solar Forecast Engine.
 * Converts location, panel capacity (kW), and hourly weather into 24-hour generation & confidence bands.
 */
export function calculateSolarForecast(
  location: LocationInfo,
  panelCapacityKW: number,
  weatherData: RawHourlyWeatherData[],
  dateStr: string,
  isFallback: boolean = false
): SolarForecastResult {
  // Input validations: panel capacity must never be negative
  const safeCapacity = Math.max(0, panelCapacityKW);

  // Overall system Performance Ratio (PR)
  // Standard residential PV system: ~0.82 (inverter efficiency ~97%, cabling ~2%, dirt/soiling ~3%, temp coefficient ~4%)
  const SYSTEM_PERFORMANCE_RATIO = 0.82;
  const STANDARD_TEST_IRRADIANCE = 1000; // W/m² (STC irradiance benchmark)

  const hourlyPoints: HourlyForecastPoint[] = [];
  let totalGeneration = 0;
  let peakHour = 12;
  let peakKW = 0;

  // Measure average cloud variability for confidence rating
  let daylightCloudSum = 0;
  let daylightHoursCount = 0;

  weatherData.forEach((item) => {
    const h = item.hour;
    // Irradiance in W/m²
    const ghi = item.shortwaveRadiation ?? (item.directNormalIrradiance ?? 0) + (item.diffuseIrradiance ?? 0);
    const cloud = Math.min(100, Math.max(0, item.cloudCoverPct ?? 0));
    const temp = item.temperatureC ?? 25;

    // Strict rule: Night-time solar generation = 0, never negative
    if (ghi <= 15 || h < 5 || h > 19) {
      hourlyPoints.push({
        hour: h,
        solarGenerationKWh: 0,
        confidenceLower: 0,
        confidenceUpper: 0,
        directIrradianceWm2: 0,
        diffuseIrradianceWm2: 0,
        cloudCoverPct: cloud,
        temperatureC: temp,
      });
      return;
    }

    daylightCloudSum += cloud;
    daylightHoursCount++;

    // Temperature derating: PV cells lose ~0.4% efficiency per degree C above 25°C
    const tempDerating = 1 - Math.max(0, (temp - 25) * 0.0035);

    // Generation in kW (kWh for 1 hour)
    // power = panelCapacityKW * (irradiance / 1000) * PR * tempDerating
    const rawPower = safeCapacity * (ghi / STANDARD_TEST_IRRADIANCE) * SYSTEM_PERFORMANCE_RATIO * tempDerating;
    const expectedKWh = Number(Math.max(0, Math.min(safeCapacity * 1.05, rawPower)).toFixed(3));

    // Confidence band attached ONLY to solar forecast (due to cloud drift & irradiance variance)
    // Clear skies (low cloud) have tight bounds (±8%), high clouds have wider bounds (±25%)
    const cloudUncertainty = 0.08 + (cloud / 100) * 0.18;
    const lowerKWh = Number(Math.max(0, expectedKWh * (1 - cloudUncertainty)).toFixed(3));
    const upperKWh = Number(Math.min(safeCapacity * 1.15, expectedKWh * (1 + cloudUncertainty * 0.9)).toFixed(3));

    totalGeneration += expectedKWh;
    if (expectedKWh > peakKW) {
      peakKW = expectedKWh;
      peakHour = h;
    }

    hourlyPoints.push({
      hour: h,
      solarGenerationKWh: expectedKWh,
      confidenceLower: lowerKWh,
      confidenceUpper: upperKWh,
      directIrradianceWm2: item.directNormalIrradiance ?? Math.round(ghi * 0.7),
      diffuseIrradianceWm2: item.diffuseIrradiance ?? Math.round(ghi * 0.3),
      cloudCoverPct: cloud,
      temperatureC: temp,
    });
  });

  // Calculate useful solar window (hours where solar generation is > 15% of peak capacity)
  const thresholdKW = Math.max(0.15, safeCapacity * 0.12);
  const activeHours = hourlyPoints.filter((pt) => pt.solarGenerationKWh >= thresholdKW);

  let usefulWindow: UsefulSolarWindow;
  if (activeHours.length > 0) {
    const startH = activeHours[0].hour;
    const endH = activeHours[activeHours.length - 1].hour + 1; // inclusive end boundary
    const avgKW = Number((activeHours.reduce((acc, curr) => acc + curr.solarGenerationKWh, 0) / activeHours.length).toFixed(2));
    usefulWindow = {
      startHour: startH,
      endHour: endH,
      averageGenerationKW: avgKW,
      peakHour,
      peakKW: Number(peakKW.toFixed(2)),
    };
  } else {
    usefulWindow = {
      startHour: 10,
      endHour: 15,
      averageGenerationKW: 0,
      peakHour: 12,
      peakKW: 0,
    };
  }

  // Calculate total confidence bounds
  const totalLower = Number(hourlyPoints.reduce((acc, p) => acc + p.confidenceLower, 0).toFixed(2));
  const totalUpper = Number(hourlyPoints.reduce((acc, p) => acc + p.confidenceUpper, 0).toFixed(2));

  // Determine forecast confidence based on daytime cloud variance
  const avgDaylightCloud = daylightHoursCount > 0 ? daylightCloudSum / daylightHoursCount : 30;
  let forecastConfidence: 'high' | 'medium' | 'low';
  if (avgDaylightCloud < 25) {
    forecastConfidence = 'high';
  } else if (avgDaylightCloud < 55) {
    forecastConfidence = 'medium';
  } else {
    forecastConfidence = 'low';
  }

  const summary = avgDaylightCloud < 25
    ? 'Predominantly clear skies, excellent solar irradiance expected across the midday window.'
    : avgDaylightCloud < 55
    ? 'Partly cloudy conditions with moderate irradiance; stable solar window between late morning and mid-afternoon.'
    : 'Elevated cloud cover forecasted; generation expected to be more variable, wider confidence band.';

  return {
    date: dateStr,
    locationName: location.name,
    panelCapacityKW: safeCapacity,
    hourly: hourlyPoints,
    totalSolarGenerationKWh: Number(totalGeneration.toFixed(2)),
    confidenceLowerTotal: totalLower,
    confidenceUpperTotal: totalUpper,
    peakGenerationHour: peakHour,
    peakGenerationKW: Number(peakKW.toFixed(2)),
    usefulSolarWindow: usefulWindow,
    forecastConfidence,
    isDeterministicFallback: isFallback,
    weatherSummary: summary,
  };
}
