import { HouseholdConfig } from '../models/household';
import { Appliance } from '../models/appliance';

/**
 * Deterministic signature for Household Configuration.
 * Produces identical string for identical configuration.
 */
export function getHouseholdSignature(household: HouseholdConfig): string {
  const norm = {
    loc: `${household.location.latitude.toFixed(4)},${household.location.longitude.toFixed(4)},${household.location.name}`,
    cap: Number(household.panelCapacityKW).toFixed(2),
    occCount: household.occupantsCount,
    occPattern: household.occupancyPattern,
    occHours: Array.isArray(household.occupancyHours)
      ? household.occupancyHours.map((h) => (h ? '1' : '0')).join('')
      : '',
    tariff: Number(household.electricityTariff).toFixed(2),
    exportRate: Number(household.exportRate).toFixed(2),
    exportEnabled: !!household.solarExportEnabled,
    peakEnabled: !!household.peakPricingEnabled,
    peakTariff: household.peakPricingEnabled ? Number(household.peakTariff).toFixed(2) : '0',
    peakStart: household.peakPricingEnabled ? household.peakStartHour : 0,
    peakEnd: household.peakPricingEnabled ? household.peakEndHour : 0,
  };
  return JSON.stringify(norm);
}

/**
 * Deterministic signature for Appliance Configuration.
 * Sorts appliances by ID so order changes do not falsely invalidate signatures.
 */
export function getAppliancesSignature(appliances: Appliance[]): string {
  const sorted = [...appliances].sort((a, b) => a.id.localeCompare(b.id));
  const norm = sorted.map((a) => ({
    id: a.id,
    name: a.name.trim(),
    power: Number(a.powerKW).toFixed(2),
    duration: Number(a.durationHours).toFixed(2),
    start: a.normalStartHour,
    flex: !!a.flexible,
    allowStart: a.allowedStartHour,
    allowEnd: a.allowedEndHour,
    occ: !!a.requiresOccupancy,
    prio: a.priority,
    enabled: a.enabled !== false,
  }));
  return JSON.stringify(norm);
}

export interface StoredOptimizationPlan {
  householdSignature: string;
  applianceSignature: string;
  forecast: any;
  impact: any;
  generatedAt: number;
}
