import { Appliance } from '../models/appliance';
import { HouseholdConfig } from '../models/household';
import { ActiveApplianceSlice } from '../models/schedule';

export interface DemandProfileHour {
  hour: number;
  totalDemandKWh: number;
  fixedDemandKWh: number;
  flexibleDemandKWh: number;
  baselineDemandKWh: number;
  activeAppliances: ActiveApplianceSlice[];
}

export type ScheduleMap = Record<string, number>;

/**
 * Computes the energy profile across 24 hours given appliances and an optional schedule map (start hours).
 * For multi-hour appliances, runs as a continuous contiguous block.
 */
export function estimateHouseholdDemand(
  appliances: Appliance[],
  household: HouseholdConfig,
  customStartTimes?: ScheduleMap
): DemandProfileHour[] {
  const profile: DemandProfileHour[] = [];
  const enabledAppliances = appliances.filter((a) => a.enabled && a.powerKW > 0 && a.durationHours > 0);

  // Baseline load per hour from background electronics & occupants (e.g. 0.04 kW per person + 0.08 kW base)
  const baselineKW = Number((0.06 + household.occupantsCount * 0.035).toFixed(3));

  for (let h = 0; h < 24; h++) {
    let fixedKW = baselineKW;
    let flexibleKW = 0;
    const activeList: ActiveApplianceSlice[] = [
      {
        applianceId: 'baseline-standby',
        name: `Standby & Baseline (${household.occupantsCount} pers.)`,
        powerKW: baselineKW,
        fractionOfHour: 1.0,
        isFlexible: false,
      },
    ];

    enabledAppliances.forEach((app) => {
      // Determine effective start hour
      const startHour = customStartTimes && customStartTimes[app.id] !== undefined
        ? customStartTimes[app.id]
        : app.normalStartHour;

      const duration = app.durationHours;
      const endHourFloat = startHour + duration;

      // Check if appliance runs during hour [h, h+1)
      // Continuous block calculation
      let activeFraction = 0;

      // Standard continuous block within day boundary
      if (h >= startHour && h < endHourFloat) {
        // Appliance active in this hour
        const hourStart = h;
        const hourEnd = h + 1;
        const overlapStart = Math.max(hourStart, startHour);
        const overlapEnd = Math.min(hourEnd, endHourFloat);
        activeFraction = Math.max(0, overlapEnd - overlapStart);
      } else if (endHourFloat > 24) {
        // Continuous block wraps around midnight into early morning hours
        const wrappedEnd = endHourFloat - 24;
        if (h < wrappedEnd) {
          const overlapEnd = Math.min(h + 1, wrappedEnd);
          activeFraction = Math.max(0, overlapEnd - h);
        }
      }

      if (activeFraction > 0.001) {
        const energySliceKWh = Number((app.powerKW * activeFraction).toFixed(3));
        if (app.flexible) {
          flexibleKW += energySliceKWh;
        } else {
          fixedKW += energySliceKWh;
        }

        activeList.push({
          applianceId: app.id,
          name: app.name,
          powerKW: app.powerKW,
          fractionOfHour: Number(activeFraction.toFixed(2)),
          isFlexible: app.flexible,
        });
      }
    });

    const total = Number((fixedKW + flexibleKW).toFixed(3));

    profile.push({
      hour: h,
      totalDemandKWh: total,
      fixedDemandKWh: Number(fixedKW.toFixed(3)),
      flexibleDemandKWh: Number(flexibleKW.toFixed(3)),
      baselineDemandKWh: baselineKW,
      activeAppliances: activeList,
    });
  }

  return profile;
}

/**
 * Calculates total 24-hour energy consumption in kWh
 */
export function calculateTotalDemandKWh(profile: DemandProfileHour[]): number {
  return Number(profile.reduce((acc, h) => acc + h.totalDemandKWh, 0).toFixed(2));
}
