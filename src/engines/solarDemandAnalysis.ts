import { HourlyForecastPoint } from '../models/forecast';
import { HouseholdConfig } from '../models/household';
import { HourlyEnergyPoint, HourBalanceClassification, SolarOpportunityWindow } from '../models/schedule';
import { DemandProfileHour } from './demandEstimator';

/**
 * Analyzes hourly balance between solar generation and household demand.
 */
export function analyzeSolarDemandBalance(
  solarForecast: HourlyForecastPoint[],
  demandProfile: DemandProfileHour[],
  household: HouseholdConfig
): HourlyEnergyPoint[] {
  const points: HourlyEnergyPoint[] = [];

  for (let h = 0; h < 24; h++) {
    const solarPt = solarForecast[h] || { solarGenerationKWh: 0 };
    const demandPt = demandProfile[h] || {
      totalDemandKWh: 0,
      fixedDemandKWh: 0,
      flexibleDemandKWh: 0,
      activeAppliances: [],
    };

    const solar = Math.max(0, solarPt.solarGenerationKWh);
    const demand = Math.max(0, demandPt.totalDemandKWh);

    const directSolarUse = Math.min(solar, demand);
    const gridImport = Math.max(demand - solar, 0);
    const surplusSolar = Math.max(solar - demand, 0);

    // Classification
    let classification: HourBalanceClassification = 'MATCH';
    const delta = solar - demand;
    if (delta > 0.05) {
      classification = 'SURPLUS';
    } else if (delta < -0.05) {
      classification = 'SHORTAGE';
    } else {
      classification = 'MATCH';
    }

    // Determine hourly electricity tariff
    let tariff = household.electricityTariff;
    if (household.peakPricingEnabled) {
      if (h >= household.peakStartHour && h < household.peakEndHour) {
        tariff = household.peakTariff;
      }
    }

    // Estimated grid cost: grid import cost minus feed-in compensation if net metering enabled
    const importCost = gridImport * tariff;
    const exportCredit = household.solarExportEnabled ? surplusSolar * household.exportRate : 0;
    const netCost = importCost - exportCredit;

    points.push({
      hour: h,
      totalDemandKWh: Number(demand.toFixed(3)),
      fixedDemandKWh: Number(demandPt.fixedDemandKWh.toFixed(3)),
      flexibleDemandKWh: Number(demandPt.flexibleDemandKWh.toFixed(3)),
      solarGenerationKWh: Number(solar.toFixed(3)),
      directSolarUseKWh: Number(directSolarUse.toFixed(3)),
      gridImportKWh: Number(gridImport.toFixed(3)),
      surplusSolarKWh: Number(surplusSolar.toFixed(3)),
      classification,
      activeAppliances: demandPt.activeAppliances,
      tariffRate: tariff,
      cost: Number(netCost.toFixed(3)),
    });
  }

  return points;
}

/**
 * Identifies contiguous solar surplus windows that are significant enough
 * to host flexible electrical appliances.
 * Avoids treating tiny 0.05 - 0.1 kWh trickles as viable opportunities.
 */
export function identifySolarOpportunityWindows(
  balancePoints: HourlyEnergyPoint[],
  minSurplusThresholdKWh: number = 0.25
): SolarOpportunityWindow[] {
  const windows: SolarOpportunityWindow[] = [];
  let currentWindow: {
    startHour: number;
    hours: number[];
    surplusSum: number;
    peakKW: number;
  } | null = null;

  for (let h = 0; h < 24; h++) {
    const surplus = balancePoints[h].surplusSolarKWh;

    if (surplus >= minSurplusThresholdKWh) {
      if (!currentWindow) {
        currentWindow = {
          startHour: h,
          hours: [h],
          surplusSum: surplus,
          peakKW: surplus,
        };
      } else {
        currentWindow.hours.push(h);
        currentWindow.surplusSum += surplus;
        currentWindow.peakKW = Math.max(currentWindow.peakKW, surplus);
      }
    } else {
      if (currentWindow) {
        const duration = currentWindow.hours.length;
        const totalSurplus = Number(currentWindow.surplusSum.toFixed(2));
        const isStrong = totalSurplus >= 0.5 && duration >= 1;

        windows.push({
          startHour: currentWindow.startHour,
          endHour: currentWindow.startHour + duration,
          durationHours: duration,
          totalSurplusKWh: totalSurplus,
          peakSurplusKW: Number(currentWindow.peakKW.toFixed(2)),
          isStrongOpportunity: isStrong,
          description: isStrong
            ? `${duration}h window (${currentWindow.startHour}:00 - ${currentWindow.startHour + duration}:00) with ${totalSurplus} kWh clean surplus`
            : `Minor surplus window (${totalSurplus} kWh)`,
        });
        currentWindow = null;
      }
    }
  }

  // Handle boundary
  if (currentWindow) {
    const duration = currentWindow.hours.length;
    const totalSurplus = Number(currentWindow.surplusSum.toFixed(2));
    const isStrong = totalSurplus >= 0.5 && duration >= 1;

    windows.push({
      startHour: currentWindow.startHour,
      endHour: currentWindow.startHour + duration,
      durationHours: duration,
      totalSurplusKWh: totalSurplus,
      peakSurplusKW: Number(currentWindow.peakKW.toFixed(2)),
      isStrongOpportunity: isStrong,
      description: isStrong
        ? `${duration}h window (${currentWindow.startHour}:00 - ${currentWindow.startHour + duration}:00) with ${totalSurplus} kWh clean surplus`
        : `Minor surplus window (${totalSurplus} kWh)`,
    });
  }

  return windows;
}
