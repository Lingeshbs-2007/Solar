export interface HourlyForecastPoint {
  hour: number;                     // 0 to 23
  solarGenerationKWh: number;       // Expected generation in that hour
  confidenceLower: number;          // Lower 80% CI bound
  confidenceUpper: number;          // Upper 80% CI bound
  directIrradianceWm2: number;      // W/m2 direct
  diffuseIrradianceWm2: number;     // W/m2 diffuse
  cloudCoverPct: number;            // 0 - 100%
  temperatureC: number;
}

export interface UsefulSolarWindow {
  startHour: number;
  endHour: number;
  averageGenerationKW: number;
  peakHour: number;
  peakKW: number;
}

export interface SolarForecastResult {
  date: string;
  locationName: string;
  panelCapacityKW: number;
  hourly: HourlyForecastPoint[];
  totalSolarGenerationKWh: number;
  confidenceLowerTotal: number;
  confidenceUpperTotal: number;
  peakGenerationHour: number;
  peakGenerationKW: number;
  usefulSolarWindow: UsefulSolarWindow;
  forecastConfidence: 'high' | 'medium' | 'low';
  isDeterministicFallback: boolean;
  weatherSummary: string;
}
