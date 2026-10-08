export type HourBalanceClassification = 'SURPLUS' | 'MATCH' | 'SHORTAGE';

export interface ActiveApplianceSlice {
  applianceId: string;
  name: string;
  powerKW: number;
  fractionOfHour: number;
  isFlexible: boolean;
}

export interface HourlyEnergyPoint {
  hour: number;                     // 0..23
  totalDemandKWh: number;           // Total household demand in that hour
  fixedDemandKWh: number;           // Non-shiftable appliances + baseline
  flexibleDemandKWh: number;        // Shiftable appliance demand
  solarGenerationKWh: number;       // Solar generation
  directSolarUseKWh: number;        // min(solar, demand)
  gridImportKWh: number;            // max(demand - solar, 0)
  surplusSolarKWh: number;          // max(solar - demand, 0)
  classification: HourBalanceClassification;
  activeAppliances: ActiveApplianceSlice[];
  tariffRate: number;               // ₹/kWh in this hour
  cost: number;                     // Estimated grid cost for this hour
}

export interface ApplianceScheduleDecision {
  applianceId: string;
  applianceName: string;
  powerKW: number;
  durationHours: number;
  normalStartHour: number;
  optimizedStartHour: number;
  shiftHours: number;               // optimizedStart - normalStart
  changed: boolean;
  status: 'shifted' | 'optimal-as-is' | 'no-feasible-schedule' | 'fixed';
  statusReason?: string;
  solarBenefitKWh: number;          // Additional solar directly captured by this appliance
  gridReductionKWh: number;         // Avoided grid import
  comfortPenalty: number;           // 0..1 scale normalized penalty for shifting
  tariffSaving: number;             // Currency savings due to TOU tariff
  score: number;                    // Multi-factor candidate score
  confidence: 'high' | 'medium' | 'low';
  reason: string;                   // Concise explanation of the schedule choice
  allowedWindow: { start: number; end: number };
}

export interface SolarOpportunityWindow {
  startHour: number;
  endHour: number;
  durationHours: number;
  totalSurplusKWh: number;
  peakSurplusKW: number;
  isStrongOpportunity: boolean;     // False if tiny trickle (< 0.5 kWh total)
  description: string;
}
