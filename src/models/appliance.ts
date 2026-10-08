export type AppliancePriority = 'high' | 'medium' | 'low';
export type DaysApplicable = 'all' | 'weekdays' | 'weekends';

export interface Appliance {
  id: string;
  name: string;
  category: 'kitchen' | 'laundry' | 'water_heating' | 'cooling' | 'ev' | 'entertainment' | 'other';
  powerKW: number;            // Rated average power draw during run in kW
  durationHours: number;      // Operating run duration in hours (e.g. 1, 1.5, 2, 24)
  normalStartHour: number;    // Usual start hour in 24h format (0-23)
  flexible: boolean;          // Whether the appliance can be rescheduled
  allowedStartHour: number;   // Earliest acceptable start hour (0-23)
  allowedEndHour: number;     // Latest acceptable finish hour (0-24)
  requiresOccupancy: boolean; // Must someone be home while it runs
  priority: AppliancePriority;
  daysApplicable: DaysApplicable;
  enabled: boolean;
}

export interface ApplianceValidationError {
  field: string;
  message: string;
}

export function validateAppliance(app: Partial<Appliance>): ApplianceValidationError[] {
  const errors: ApplianceValidationError[] = [];

  if (!app.name || app.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Appliance name is required' });
  }

  if (app.powerKW === undefined || app.powerKW <= 0 || isNaN(app.powerKW)) {
    errors.push({ field: 'powerKW', message: 'Power must be greater than 0 kW' });
  } else if (app.powerKW > 30) {
    errors.push({ field: 'powerKW', message: 'Power exceeds realistic residential limit (30 kW)' });
  }

  if (app.durationHours === undefined || app.durationHours <= 0 || isNaN(app.durationHours)) {
    errors.push({ field: 'durationHours', message: 'Duration must be greater than 0 hours' });
  } else if (app.durationHours > 24) {
    errors.push({ field: 'durationHours', message: 'Duration cannot exceed 24 hours' });
  }

  if (app.normalStartHour === undefined || app.normalStartHour < 0 || app.normalStartHour > 23) {
    errors.push({ field: 'normalStartHour', message: 'Normal start hour must be between 0 and 23' });
  }

  if (app.flexible) {
    if (app.allowedStartHour === undefined || app.allowedStartHour < 0 || app.allowedStartHour > 23) {
      errors.push({ field: 'allowedStartHour', message: 'Allowed start hour must be between 0 and 23' });
    }
    if (app.allowedEndHour === undefined || app.allowedEndHour < 1 || app.allowedEndHour > 24) {
      errors.push({ field: 'allowedEndHour', message: 'Allowed end hour must be between 1 and 24' });
    }
    if (app.allowedStartHour !== undefined && app.allowedEndHour !== undefined) {
      if (app.allowedStartHour >= app.allowedEndHour) {
        errors.push({ field: 'allowedEndHour', message: 'Allowed end hour must be after start hour' });
      }
      const windowLength = app.allowedEndHour - app.allowedStartHour;
      if (app.durationHours !== undefined && app.durationHours > windowLength) {
        errors.push({
          field: 'durationHours',
          message: `Appliance duration (${app.durationHours}h) cannot exceed allowed window (${windowLength}h)`,
        });
      }
    }
  }

  return errors;
}

// Preset demo appliances specified by the user prompt
export const DEMO_APPLIANCES: Appliance[] = [
  {
    id: 'demo-fridge',
    name: 'Refrigerator',
    category: 'kitchen',
    powerKW: 0.15,
    durationHours: 24,
    normalStartHour: 0,
    flexible: false,
    allowedStartHour: 0,
    allowedEndHour: 24,
    requiresOccupancy: false,
    priority: 'high',
    daysApplicable: 'all',
    enabled: true,
  },
  {
    id: 'demo-washing-machine',
    name: 'Washing Machine',
    category: 'laundry',
    powerKW: 0.7,
    durationHours: 1.0,
    normalStartHour: 19,
    flexible: true,
    allowedStartHour: 10,
    allowedEndHour: 20,
    requiresOccupancy: true,
    priority: 'medium',
    daysApplicable: 'all',
    enabled: true,
  },
  {
    id: 'demo-dishwasher',
    name: 'Dishwasher',
    category: 'kitchen',
    powerKW: 1.2,
    durationHours: 1.5,
    normalStartHour: 20,
    flexible: true,
    allowedStartHour: 11,
    allowedEndHour: 21,
    requiresOccupancy: false,
    priority: 'medium',
    daysApplicable: 'all',
    enabled: true,
  },
  {
    id: 'demo-water-heater',
    name: 'Water Heater',
    category: 'water_heating',
    powerKW: 2.0,
    durationHours: 1.0,
    normalStartHour: 7,
    flexible: true,
    allowedStartHour: 11,
    allowedEndHour: 17,
    requiresOccupancy: false,
    priority: 'high',
    daysApplicable: 'all',
    enabled: true,
  },
  {
    id: 'demo-tv',
    name: 'Television & Entertainment',
    category: 'entertainment',
    powerKW: 0.1,
    durationHours: 3.0,
    normalStartHour: 19,
    flexible: false,
    allowedStartHour: 18,
    allowedEndHour: 23,
    requiresOccupancy: true,
    priority: 'low',
    daysApplicable: 'all',
    enabled: true,
  },
];

export const APPLIANCE_CATALOG_TEMPLATES: Omit<Appliance, 'id' | 'enabled'>[] = [
  {
    name: 'Washing Machine',
    category: 'laundry',
    powerKW: 0.7,
    durationHours: 1.0,
    normalStartHour: 19,
    flexible: true,
    allowedStartHour: 10,
    allowedEndHour: 20,
    requiresOccupancy: true,
    priority: 'medium',
    daysApplicable: 'all',
  },
  {
    name: 'Dishwasher',
    category: 'kitchen',
    powerKW: 1.2,
    durationHours: 1.5,
    normalStartHour: 20,
    flexible: true,
    allowedStartHour: 11,
    allowedEndHour: 21,
    requiresOccupancy: false,
    priority: 'medium',
    daysApplicable: 'all',
  },
  {
    name: 'Heat Pump Water Heater',
    category: 'water_heating',
    powerKW: 2.0,
    durationHours: 1.5,
    normalStartHour: 6,
    flexible: true,
    allowedStartHour: 10,
    allowedEndHour: 16,
    requiresOccupancy: false,
    priority: 'high',
    daysApplicable: 'all',
  },
  {
    name: 'EV Charger (Level 2)',
    category: 'ev',
    powerKW: 3.3,
    durationHours: 3.0,
    normalStartHour: 21,
    flexible: true,
    allowedStartHour: 10,
    allowedEndHour: 18,
    requiresOccupancy: false,
    priority: 'high',
    daysApplicable: 'all',
  },
  {
    name: 'Clothes Dryer',
    category: 'laundry',
    powerKW: 2.2,
    durationHours: 1.0,
    normalStartHour: 20,
    flexible: true,
    allowedStartHour: 11,
    allowedEndHour: 18,
    requiresOccupancy: true,
    priority: 'medium',
    daysApplicable: 'all',
  },
  {
    name: 'Pool Pump / Filtration',
    category: 'other',
    powerKW: 1.1,
    durationHours: 4.0,
    normalStartHour: 8,
    flexible: true,
    allowedStartHour: 9,
    allowedEndHour: 17,
    requiresOccupancy: false,
    priority: 'low',
    daysApplicable: 'all',
  },
  {
    name: 'Air Conditioner (Pre-cooling)',
    category: 'cooling',
    powerKW: 1.5,
    durationHours: 2.0,
    normalStartHour: 17,
    flexible: true,
    allowedStartHour: 12,
    allowedEndHour: 18,
    requiresOccupancy: false,
    priority: 'medium',
    daysApplicable: 'all',
  },
  {
    name: 'Microwave / Cooking',
    category: 'kitchen',
    powerKW: 1.0,
    durationHours: 0.5,
    normalStartHour: 19,
    flexible: false,
    allowedStartHour: 18,
    allowedEndHour: 21,
    requiresOccupancy: true,
    priority: 'medium',
    daysApplicable: 'all',
  },
];
