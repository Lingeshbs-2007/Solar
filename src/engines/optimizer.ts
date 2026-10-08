import { Appliance } from '../models/appliance';
import { HourlyForecastPoint } from '../models/forecast';
import { HouseholdConfig } from '../models/household';
import { ApplianceScheduleDecision } from '../models/schedule';
import { estimateHouseholdDemand, ScheduleMap } from './demandEstimator';
import { analyzeSolarDemandBalance } from './solarDemandAnalysis';

export interface OptimizationResult {
  scheduleMap: ScheduleMap;
  decisions: ApplianceScheduleDecision[];
  shiftedCount: number;
}

/**
 * Constraint-Aware Greedy Scheduling Optimizer with Multi-Factor Scoring.
 */
export function optimizeApplianceSchedule(
  appliances: Appliance[],
  solarForecast: HourlyForecastPoint[],
  household: HouseholdConfig
): OptimizationResult {
  const enabledAppliances = appliances.filter((a) => a.enabled && a.powerKW > 0 && a.durationHours > 0);

  // 1. Separate fixed vs flexible
  const fixedAppliances = enabledAppliances.filter((a) => !a.flexible);
  const flexibleAppliances = enabledAppliances.filter((a) => a.flexible);

  // Current schedule map begins with normal schedule for all
  const currentSchedule: ScheduleMap = {};
  enabledAppliances.forEach((a) => {
    currentSchedule[a.id] = a.normalStartHour;
  });

  // Calculate baseline normal flow before any shifts
  const normalDemand = estimateHouseholdDemand(enabledAppliances, household, currentSchedule);
  const normalBalance = analyzeSolarDemandBalance(solarForecast, normalDemand, household);

  // 2. Sort flexible appliances: Most constrained first
  // Highly constrained: narrow allowed window, longer duration, high power, high priority
  const priorityWeights: Record<string, number> = { high: 3.0, medium: 1.5, low: 0.5 };

  const sortedFlexible = [...flexibleAppliances].sort((a, b) => {
    const windowA = Math.max(1, a.allowedEndHour - a.allowedStartHour);
    const windowB = Math.max(1, b.allowedEndHour - b.allowedStartHour);

    // Slack time = allowed window - duration
    const slackA = Math.max(0, windowA - a.durationHours);
    const slackB = Math.max(0, windowB - b.durationHours);

    const prioA = priorityWeights[a.priority] || 1.0;
    const prioB = priorityWeights[b.priority] || 1.0;

    // Constraint score: lower slack + higher power + higher priority = scheduled first
    const scoreA = (10 / (slackA + 1)) * 2 + a.powerKW * 1.2 + prioA * 1.5;
    const scoreB = (10 / (slackB + 1)) * 2 + b.powerKW * 1.2 + prioB * 1.5;

    return scoreB - scoreA;
  });

  const decisions: ApplianceScheduleDecision[] = [];

  // 3. For each flexible appliance, evaluate all feasible continuous start windows
  for (const appliance of sortedFlexible) {
    const totalApplianceEnergyKWh = appliance.powerKW * appliance.durationHours;
    const normalStart = appliance.normalStartHour;

    // Candidate start hours: iterate hour by hour in allowed window
    // Ensure appliance completes within allowedEndHour: candidate + duration <= allowedEndHour
    const candidateStarts: number[] = [];
    const minStart = Math.max(0, Math.min(23, appliance.allowedStartHour));
    const maxEnd = Math.max(1, Math.min(24, appliance.allowedEndHour));

    for (let candidateH = minStart; candidateH < maxEnd; candidateH++) {
      const endH = candidateH + appliance.durationHours;
      if (endH <= maxEnd) {
        // Check occupancy constraint: if requiresOccupancy, all active hours must have household occupied
        if (appliance.requiresOccupancy) {
          let occupancySatisfied = true;
          for (let runH = candidateH; runH < Math.ceil(endH); runH++) {
            const wrappedH = runH % 24;
            if (!household.occupancyHours[wrappedH]) {
              occupancySatisfied = false;
              break;
            }
          }
          if (!occupancySatisfied) {
            continue; // Cannot place appliance when occupants are away
          }
        }
        candidateStarts.push(candidateH);
      }
    }

    // Always include the normal start hour if valid, for baseline comparison
    if (!candidateStarts.includes(normalStart)) {
      // If normalStart is within allowed range, allow it as a candidate
      if (normalStart >= minStart && normalStart + appliance.durationHours <= maxEnd) {
        candidateStarts.push(normalStart);
      }
    }

    // If no candidate start is possible due to constraints, keep normal start
    if (candidateStarts.length === 0) {
      decisions.push({
        applianceId: appliance.id,
        applianceName: appliance.name,
        powerKW: appliance.powerKW,
        durationHours: appliance.durationHours,
        normalStartHour: normalStart,
        optimizedStartHour: normalStart,
        shiftHours: 0,
        changed: false,
        solarBenefitKWh: 0,
        gridReductionKWh: 0,
        comfortPenalty: 0,
        tariffSaving: 0,
        score: 0,
        confidence: 'high',
        reason: 'Kept at normal time: No feasible operating window satisfied all occupancy and window constraints.',
        allowedWindow: { start: appliance.allowedStartHour, end: appliance.allowedEndHour },
      });
      continue;
    }

    // Calculate baseline flow WITHOUT this appliance to measure incremental impact
    const baseScheduleWithout = { ...currentSchedule };
    delete baseScheduleWithout[appliance.id];

    // Evaluate each candidate start time
    interface CandidateEval {
      startHour: number;
      solarCapturedKWh: number;
      gridImportKWh: number;
      cost: number;
      comfortPenalty: number;
      score: number;
      distanceFromNormal: number;
    }

    const candidateEvals: CandidateEval[] = [];

    // Helper: calculate balance for a temporary test schedule
    for (const testStart of candidateStarts) {
      const testSchedule = { ...currentSchedule, [appliance.id]: testStart };
      const testDemand = estimateHouseholdDemand(enabledAppliances, household, testSchedule);
      const testBalance = analyzeSolarDemandBalance(solarForecast, testDemand, household);

      // Measure total direct solar use and grid import under this candidate
      const totalDirectSolar = testBalance.reduce((sum, pt) => sum + pt.directSolarUseKWh, 0);
      const totalGridImport = testBalance.reduce((sum, pt) => sum + pt.gridImportKWh, 0);
      const totalCost = testBalance.reduce((sum, pt) => sum + pt.cost, 0);

      // Distance from user's preferred normal start
      const rawDist = Math.abs(testStart - normalStart);
      const maxPossibleShift = Math.max(1, Math.max(normalStart - minStart, maxEnd - normalStart));
      // Normalized comfort penalty: 0 (no shift) to 1 (maximum shift away)
      const comfortPenalty = Math.min(1, rawDist / Math.max(6, maxPossibleShift));

      candidateEvals.push({
        startHour: testStart,
        solarCapturedKWh: totalDirectSolar,
        gridImportKWh: totalGridImport,
        cost: totalCost,
        comfortPenalty,
        distanceFromNormal: rawDist,
        score: 0, // will compute below
      });
    }

    // Normalize candidate scoring metrics across all candidate starts
    const minGrid = Math.min(...candidateEvals.map((c) => c.gridImportKWh));
    const maxGrid = Math.max(...candidateEvals.map((c) => c.gridImportKWh));
    const gridRange = Math.max(0.001, maxGrid - minGrid);

    const minCost = Math.min(...candidateEvals.map((c) => c.cost));
    const maxCost = Math.max(...candidateEvals.map((c) => c.cost));
    const costRange = Math.max(0.001, maxCost - minCost);

    const minSolar = Math.min(...candidateEvals.map((c) => c.solarCapturedKWh));
    const maxSolar = Math.max(...candidateEvals.map((c) => c.solarCapturedKWh));
    const solarRange = Math.max(0.001, maxSolar - minSolar);

    // Multi-factor normalized score:
    // Solar Benefit: weights capturing available solar (+60%)
    // Grid import avoidance: (+30%)
    // Comfort penalty: avoids frivolous shifts for tiny 0.05 kWh gains (-25%)
    // Tariff saving: (-15% if cost is higher)
    candidateEvals.forEach((c) => {
      const normSolarBenefit = solarRange > 0.05 ? (c.solarCapturedKWh - minSolar) / solarRange : 0;
      const normGridAvoided = gridRange > 0.05 ? (maxGrid - c.gridImportKWh) / gridRange : 0;
      const normCostAvoided = costRange > 0.1 ? (maxCost - c.cost) / costRange : 0;

      // Comfort penalty weight: higher for appliances requiring occupancy
      const comfortWeight = appliance.requiresOccupancy ? 0.35 : 0.22;

      // Base candidate score
      c.score =
        normSolarBenefit * 0.60 +
        normGridAvoided * 0.25 +
        normCostAvoided * 0.15 -
        c.comfortPenalty * comfortWeight;
    });

    // Find candidate representing normal start
    const normalEval = candidateEvals.find((c) => c.startHour === normalStart) || candidateEvals[0];

    // Sort candidates by score descending
    candidateEvals.sort((a, b) => {
      // If scores are within 0.03 epsilon, prefer the slot closest to normal operating time
      if (Math.abs(b.score - a.score) < 0.03) {
        return a.distanceFromNormal - b.distanceFromNormal;
      }
      return b.score - a.score;
    });

    const bestCandidate = candidateEvals[0];

    // Calculate incremental improvement of best candidate over normal start
    const incrementalSolarBenefit = Math.max(0, bestCandidate.solarCapturedKWh - normalEval.solarCapturedKWh);
    const incrementalGridReduction = Math.max(0, normalEval.gridImportKWh - bestCandidate.gridImportKWh);
    const tariffSaving = Number(Math.max(0, normalEval.cost - bestCandidate.cost).toFixed(2));

    // Threshold rule: If best candidate provides negligible benefit (< 0.08 kWh), keep normal schedule
    const isMeaningfulImprovement = incrementalSolarBenefit >= 0.08 || incrementalGridReduction >= 0.08;
    const shouldShift = bestCandidate.startHour !== normalStart && isMeaningfulImprovement && bestCandidate.score > normalEval.score + 0.05;

    const chosenStart = shouldShift ? bestCandidate.startHour : normalStart;
    const shiftHours = chosenStart - normalStart;
    const changed = chosenStart !== normalStart;

    // Reason construction
    let reason = '';
    if (!changed) {
      if (incrementalSolarBenefit < 0.08) {
        reason = `Kept at normal ${normalStart}:00. Solar gain from shifting was negligible (<0.1 kWh); preserves user schedule.`;
      } else {
        reason = `Kept at normal ${normalStart}:00. Comfort and occupancy alignment outweighed minor solar gain.`;
      }
    } else {
      const dir = shiftHours > 0 ? `+${shiftHours}h` : `${shiftHours}h`;
      reason = `Shifted ${dir} from ${normalStart}:00 to ${chosenStart}:00. Aligns runtime with peak solar surplus, capturing +${incrementalSolarBenefit.toFixed(2)} kWh solar and reducing grid import.`;
    }

    // Update running schedule immediately so subsequent appliances compete for remaining solar
    currentSchedule[appliance.id] = chosenStart;

    decisions.push({
      applianceId: appliance.id,
      applianceName: appliance.name,
      powerKW: appliance.powerKW,
      durationHours: appliance.durationHours,
      normalStartHour: normalStart,
      optimizedStartHour: chosenStart,
      shiftHours,
      changed,
      solarBenefitKWh: Number((shouldShift ? incrementalSolarBenefit : 0).toFixed(2)),
      gridReductionKWh: Number((shouldShift ? incrementalGridReduction : 0).toFixed(2)),
      comfortPenalty: Number((shouldShift ? bestCandidate.comfortPenalty : 0).toFixed(2)),
      tariffSaving: shouldShift ? tariffSaving : 0,
      score: Number((shouldShift ? bestCandidate.score : normalEval.score).toFixed(2)),
      confidence: 'high',
      reason,
      allowedWindow: { start: appliance.allowedStartHour, end: appliance.allowedEndHour },
    });
  }

  // Record decisions for fixed appliances (cannot move)
  fixedAppliances.forEach((app) => {
    decisions.push({
      applianceId: app.id,
      applianceName: app.name,
      powerKW: app.powerKW,
      durationHours: app.durationHours,
      normalStartHour: app.normalStartHour,
      optimizedStartHour: app.normalStartHour,
      shiftHours: 0,
      changed: false,
      solarBenefitKWh: 0,
      gridReductionKWh: 0,
      comfortPenalty: 0,
      tariffSaving: 0,
      score: 1.0,
      confidence: 'high',
      reason: 'Fixed appliance. Cannot be rescheduled per household constraint.',
      allowedWindow: { start: app.normalStartHour, end: app.normalStartHour + app.durationHours },
    });
  });

  const shiftedCount = decisions.filter((d) => d.changed).length;

  return {
    scheduleMap: currentSchedule,
    decisions,
    shiftedCount,
  };
}
