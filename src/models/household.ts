export type OccupancyPattern = 'always_home' | 'office_hours' | 'evening_only' | 'morning_evening' | 'custom';

export interface LocationInfo {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const POPULAR_LOCATIONS: LocationInfo[] = [
  { name: 'Bengaluru, India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'New Delhi, India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
  { name: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Hyderabad, India', latitude: 17.3850, longitude: 78.4867, timezone: 'Asia/Kolkata' },
  { name: 'Chennai, India', latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata' },
  { name: 'Pune, India', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { name: 'Jaipur, India', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
  { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Los Angeles, USA', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
  { name: 'London, UK', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'Munich, Germany', latitude: 48.1351, longitude: 11.5820, timezone: 'Europe/Berlin' },
];

export interface HouseholdConfig {
  location: LocationInfo;
  panelCapacityKW: number;
  occupantsCount: number;
  occupancyPattern: OccupancyPattern;
  // 24 booleans for hours 0..23 indicating whether household is occupied
  occupancyHours: boolean[];
  // Tariff in ₹/kWh (or local currency unit)
  electricityTariff: number;
  // Feed-in export tariff in ₹/kWh
  exportRate: number;
  // Optional peak hour pricing
  peakPricingEnabled: boolean;
  peakTariff: number;
  peakStartHour: number;
  peakEndHour: number;
  // Net metering / solar export enabled
  solarExportEnabled: boolean;
}

export function getDefaultOccupancyHours(pattern: OccupancyPattern): boolean[] {
  const hours = new Array(24).fill(true);
  switch (pattern) {
    case 'office_hours':
      // Away from 09:00 to 18:00
      for (let h = 9; h < 18; h++) hours[h] = false;
      break;
    case 'evening_only':
      // Away from 08:00 to 19:00
      for (let h = 8; h < 19; h++) hours[h] = false;
      break;
    case 'morning_evening':
      // Away 10:00 to 16:00
      for (let h = 10; h < 16; h++) hours[h] = false;
      break;
    case 'always_home':
    default:
      // Home all day
      break;
  }
  return hours;
}

export const DEFAULT_HOUSEHOLD_CONFIG: HouseholdConfig = {
  location: POPULAR_LOCATIONS[0], // Bengaluru
  panelCapacityKW: 3.0,
  occupantsCount: 4,
  occupancyPattern: 'office_hours',
  occupancyHours: getDefaultOccupancyHours('office_hours'),
  electricityTariff: 7.5, // ₹7.50 / kWh
  exportRate: 3.0,        // ₹3.00 / kWh feed-in
  peakPricingEnabled: true,
  peakTariff: 10.5,       // ₹10.50 / kWh during evening peak
  peakStartHour: 18,
  peakEndHour: 22,
  solarExportEnabled: true,
};
