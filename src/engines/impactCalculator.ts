import { Appliance } from '../models/appliance';
import { SolarForecastResult } from '../models/forecast';
import { HouseholdConfig } from '../models/household';
import { ImpactSummary } from '../models/impact';
import { estimateHouseholdDemand } from './demandEstimator';
import { optimizeApplianceSchedule } from './optimizer';
import { analyzeSolarDemandBalance, identifySolarOpportunityWindows } from './solarDemandAnalysis';

/**
 * Calculates deterministic simulation impact comparing Normal schedule vs Optimized schedule.
 */
export function calculateImpactSummary(
  appliances: Appliance[],
  forecast: SolarForecastResult,
  household: HouseholdConfig
): ImpactSummary {
  // 1. Normal schedule run (each appliance at its normalStartHour)
  const normalScheduleMap: Record<string, number> = {};
  appliances.forEach((a) => {
    normalScheduleMap[a.id] = a.normalStartHour;
  });

  const normalDemand = estimateHouseholdDemand(appliances, household, normalScheduleMap);
  const normalHourly = analyzeSolarDemandBalance(forecast.hourly, normalDemand, household);

  // 2. Optimized schedule run via constraint-aware greedy optimizer
  const optResult = optimizeApplianceSchedule(
    appliances,
    forecast.hourly,
    household,
    forecast.forecastConfidence
  );
  const optimizedDemand = estimateHouseholdDemand(appliances, household, optResult.scheduleMap);
  const optimizedHourly = analyzeSolarDemandBalance(forecast.hourly, optimizedDemand, household);

  // 3. Compute aggregate solar direct use
  const totalSolarGen = Math.max(0.01, forecast.totalSolarGenerationKWh);

  const normalDirectSolar = Number(
    normalHourly.reduce((sum, h) => sum + h.directSolarUseKWh, 0).toFixed(2)
  );
  const optDirectSolar = Number(
    optimizedHourly.reduce((sum, h) => sum + h.directSolarUseKWh, 0).toFixed(2)
  );
  const solarDirectUseGain = Number(Math.max(0, optDirectSolar - normalDirectSolar).toFixed(2));

  // 4. Compute Self-Consumption % = directSolarUse / totalSolarGeneration * 100
  const normalSelfConsumptionPct = Number(
    Math.min(100, (normalDirectSolar / totalSolarGen) * 100).toFixed(1)
  );
  const optSelfConsumptionPct = Number(
    Math.min(100, (optDirectSolar / totalSolarGen) * 100).toFixed(1)
  );
  const selfConsumptionGainPctPoints = Number(
    (optSelfConsumptionPct - normalSelfConsumptionPct).toFixed(1)
  );

  // 5. Compute Grid Import & Grid Reduction
  const normalGridImport = Number(
    normalHourly.reduce((sum, h) => sum + h.gridImportKWh, 0).toFixed(2)
  );
  const optGridImport = Number(
    optimizedHourly.reduce((sum, h) => sum + h.gridImportKWh, 0).toFixed(2)
  );
  const gridReductionKWh = Number(
    Math.max(0, normalGridImport - optGridImport).toFixed(2)
  );
  const gridReductionPct = normalGridImport > 0
    ? Number(((gridReductionKWh / normalGridImport) * 100).toFixed(1))
    : 0;

  // 6. Compute Surplus / Exportable solar
  const normalSurplus = Number(
    normalHourly.reduce((sum, h) => sum + h.surplusSolarKWh, 0).toFixed(2)
  );
  const optSurplus = Number(
    optimizedHourly.reduce((sum, h) => sum + h.surplusSolarKWh, 0).toFixed(2)
  );

  // 7. Potential Cost Impact (₹)
  const normalCostINR = Number(
    normalHourly.reduce((sum, h) => sum + h.cost, 0).toFixed(2)
  );
  const optCostINR = Number(
    optimizedHourly.reduce((sum, h) => sum + h.cost, 0).toFixed(2)
  );
  const potentialCostImpactINR = Number(
    (normalCostINR - optCostINR).toFixed(2)
  );

  // 8. CO2 Avoided (Grid emission factor approx 0.71 kg CO2 per kWh grid reduction in India/global average)
  const co2AvoidedKg = Number((gridReductionKWh * 0.71).toFixed(2));

  // 9. Solar opportunity windows detection under normal schedule
  const opportunityWindows = identifySolarOpportunityWindows(normalHourly);

  return {
    totalSolarGenerationKWh: totalSolarGen,
    normalSolarUsedDirectlyKWh: normalDirectSolar,
    optimizedSolarUsedDirectlyKWh: optDirectSolar,
    solarDirectUseGainKWh: solarDirectUseGain,

    normalSelfConsumptionPct,
    optimizedSelfConsumptionPct: optSelfConsumptionPct,
    selfConsumptionGainPctPoints,

    normalGridImportKWh: normalGridImport,
    optimizedGridImportKWh: optGridImport,
    gridReductionKWh,
    gridReductionPct,

    normalSurplusKWh: normalSurplus,
    optimizedSurplusKWh: optSurplus,

    normalCostINR,
    optimizedCostINR: optCostINR,
    potentialCostImpactINR,

    co2AvoidedKg,

    applianceDecisions: optResult.decisions,
    shiftedAppliancesCount: optResult.shiftedCount,
    totalAppliancesCount: appliances.length,

    normalHourly,
    optimizedHourly,
    forecast,
    opportunityWindows,
  };
}
