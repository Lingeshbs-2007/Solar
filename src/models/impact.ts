import { ApplianceScheduleDecision, HourlyEnergyPoint, SolarOpportunityWindow } from './schedule';
import { SolarForecastResult } from './forecast';

export interface ImpactSummary {
  // Solar metrics
  totalSolarGenerationKWh: number;
  normalSolarUsedDirectlyKWh: number;
  optimizedSolarUsedDirectlyKWh: number;
  solarDirectUseGainKWh: number;

  // Self-consumption % (directSolarUse / totalSolarGeneration * 100)
  normalSelfConsumptionPct: number;
  optimizedSelfConsumptionPct: number;
  selfConsumptionGainPctPoints: number;

  // Grid import metrics
  normalGridImportKWh: number;
  optimizedGridImportKWh: number;
  gridReductionKWh: number;
  gridReductionPct: number;

  // Solar surplus / export metrics
  normalSurplusKWh: number;
  optimizedSurplusKWh: number;

  // Potential cost impact (₹)
  normalCostINR: number;
  optimizedCostINR: number;
  potentialCostImpactINR: number; // normalCost - optimizedCost

  // Ecological impact
  co2AvoidedKg: number; // based on grid emission factor ~0.71 kg CO2/kWh

  // Schedule details
  applianceDecisions: ApplianceScheduleDecision[];
  shiftedAppliancesCount: number;
  totalAppliancesCount: number;

  // Hourly breakdowns
  normalHourly: HourlyEnergyPoint[];
  optimizedHourly: HourlyEnergyPoint[];
  forecast: SolarForecastResult;
  opportunityWindows: SolarOpportunityWindow[];
}
