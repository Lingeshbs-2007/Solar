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
 * Constraint-Aware Greedy Scheduling Optimizer with Multi-Factor Scoring & Confidence Awareness.
 */
export function optimizeApplianceSchedule(
  appliances: Appliance[],
  solarForecast: HourlyForecastPoint[],
  household: HouseholdConfig,
  forecastConfidence: 'high' | 'medium' | 'low' = 'medium'
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
    const normalStart = appliance.normalStartHour;
    const minStart = Math.max(0, Math.min(23, appliance.allowedStartHour));
    const maxEnd = Math.max(1, Math.min(24, appliance.allowedEndHour));

    const candidateStarts: number[] = [];
    let hadOccupancyViolation = false;

    for (let candidateH = minStart; candidateH < maxEnd; candidateH++) {
      const endH = candidateH + appliance.durationHours;
      if (endH <= maxEnd) {
        // Fractional occupancy check: verify only intervals where the appliance is actually running
        if (appliance.requiresOccupancy) {
          let occupancySatisfied = true;
          for (let h = 0; h < 24; h++) {
            const hourStart = h;
            const hourEnd = h + 1;
            const overlap = Math.max(0, Math.min(endH, hourEnd) - Math.max(candidateH, hourStart));
            if (overlap > 0.001) {
              const wrappedHour = h % 24;
              if (!household.occupancyHours[wrappedHour]) {
                occupancySatisfied = false;
                hadOccupancyViolation = true;
                break;
              }
            }
          }
          if (!occupancySatisfied) {
            continue; // Cannot place appliance when occupants are away during active runtime
          }
        }
        candidateStarts.push(candidateH);
      }
    }

    // Always include the normal start hour if valid, for baseline comparison
    if (!candidateStarts.includes(normalStart)) {
      if (normalStart >= minStart && normalStart + appliance.durationHours <= maxEnd) {
        if (!appliance.requiresOccupancy) {
          candidateStarts.push(normalStart);
        } else {
          // Check normal start occupancy
          let normOccOk = true;
          const endNorm = normalStart + appliance.durationHours;
          for (let h = 0; h < 24; h++) {
            const overlap = Math.max(0, Math.min(endNorm, h + 1) - Math.max(normalStart, h));
            if (overlap > 0.001 && !household.occupancyHours[h % 24]) {
              normOccOk = false;
              break;
            }
          }
          if (normOccOk) {
            candidateStarts.push(normalStart);
          }
        }
      }
    }

    // If no candidate start is possible due to constraints, handle "no-feasible-schedule"
    if (candidateStarts.length === 0) {
      const failReason = appliance.durationHours > maxEnd - minStart
        ? `Operating window (${minStart}:00 - ${maxEnd}:00) is too narrow for appliance duration (${appliance.durationHours}h).`
        : hadOccupancyViolation
        ? `All candidate hours within allowed window (${minStart}:00 - ${maxEnd}:00) conflict with household away schedule.`
        : `No feasible continuous slot available within configured constraints.`;

      decisions.push({
        applianceId: appliance.id,
        applianceName: appliance.name,
        powerKW: appliance.powerKW,
        durationHours: appliance.durationHours,
        normalStartHour: normalStart,
        optimizedStartHour: normalStart,
        shiftHours: 0,
        changed: false,
        status: 'no-feasible-schedule',
        statusReason: failReason,
        solarBenefitKWh: 0,
        gridReductionKWh: 0,
        comfortPenalty: 0,
        tariffSaving: 0,
        score: 0,
        confidence: forecastConfidence,
        reason: `Kept at normal time: ${failReason}`,
        allowedWindow: { start: appliance.allowedStartHour, end: appliance.allowedEndHour },
      });
      continue;
    }

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

    for (const testStart of candidateStarts) {
      const testSchedule = { ...currentSchedule, [appliance.id]: testStart };
      const testDemand = estimateHouseholdDemand(enabledAppliances, household, testSchedule);
      const testBalance = analyzeSolarDemandBalance(solarForecast, testDemand, household);

      const totalDirectSolar = testBalance.reduce((sum, pt) => sum + pt.directSolarUseKWh, 0);
      const totalGridImport = testBalance.reduce((sum, pt) => sum + pt.gridImportKWh, 0);
      const totalCost = testBalance.reduce((sum, pt) => sum + pt.cost, 0);

      const rawDist = Math.abs(testStart - normalStart);
      const maxPossibleShift = Math.max(1, Math.max(normalStart - minStart, maxEnd - normalStart));
      const comfortPenalty = Math.min(1, rawDist / Math.max(6, maxPossibleShift));

      candidateEvals.push({
        startHour: testStart,
        solarCapturedKWh: totalDirectSolar,
        gridImportKWh: totalGridImport,
        cost: totalCost,
        comfortPenalty,
        distanceFromNormal: rawDist,
        score: 0,
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

    // Confidence-aware optimization weights:
    // When confidence is low, penalize comfort disruptions more heavily and be conservative
    const baseComfortWeight = appliance.requiresOccupancy ? 0.35 : 0.22;
    const comfortMultiplier = forecastConfidence === 'low' ? 1.6 : forecastConfidence === 'medium' ? 1.1 : 1.0;
    const comfortWeight = baseComfortWeight * comfortMultiplier;

    candidateEvals.forEach((c) => {
      const normSolarBenefit = solarRange > 0.05 ? (c.solarCapturedKWh - minSolar) / solarRange : 0;
      const normGridAvoided = gridRange > 0.05 ? (maxGrid - c.gridImportKWh) / gridRange : 0;
      const normCostAvoided = costRange > 0.1 ? (maxCost - c.cost) / costRange : 0;

      c.score =
        normSolarBenefit * 0.60 +
        normGridAvoided * 0.25 +
        normCostAvoided * 0.15 -
        c.comfortPenalty * comfortWeight;
    });

    const normalEval = candidateEvals.find((c) => c.startHour === normalStart) || candidateEvals[0];

    // Sort candidates: highest score first, tie-break to closest to preferred normal time and higher solar
    candidateEvals.sort((a, b) => {
      if (Math.abs(b.score - a.score) < 0.03) {
        if (a.distanceFromNormal !== b.distanceFromNormal) {
          return a.distanceFromNormal - b.distanceFromNormal;
        }
        return b.solarCapturedKWh - a.solarCapturedKWh;
      }
      return b.score - a.score;
    });

    const bestCandidate = candidateEvals[0];

    const incrementalSolarBenefit = Math.max(0, bestCandidate.solarCapturedKWh - normalEval.solarCapturedKWh);
    const incrementalGridReduction = Math.max(0, normalEval.gridImportKWh - bestCandidate.gridImportKWh);
    const tariffSaving = Number(Math.max(0, normalEval.cost - bestCandidate.cost).toFixed(2));

    // Confidence-aware threshold:
    // When confidence is low, require higher threshold before shifting
    const minGainThreshold = forecastConfidence === 'low' ? 0.20 : forecastConfidence === 'medium' ? 0.12 : 0.08;

    const isMeaningfulImprovement = incrementalSolarBenefit >= minGainThreshold || incrementalGridReduction >= minGainThreshold;
    const shouldShift = bestCandidate.startHour !== normalStart && isMeaningfulImprovement && bestCandidate.score > normalEval.score + 0.05;

    const chosenStart = shouldShift ? bestCandidate.startHour : normalStart;
    const shiftHours = chosenStart - normalStart;
    const changed = chosenStart !== normalStart;

    let reason = '';
    let status: ApplianceScheduleDecision['status'] = 'optimal-as-is';

    if (!changed) {
      status = 'optimal-as-is';
      if (bestCandidate.startHour === normalStart) {
        reason = `Your current schedule already aligns well with available solar generation.`;
      } else if (forecastConfidence === 'low') {
        reason = `Kept at preferred ${normalStart}:00. Solar forecast confidence is low, so conservative scheduling maintains normal routine.`;
      } else {
        reason = `Kept at preferred ${normalStart}:00. Estimated solar gain from shifting was negligible (<${minGainThreshold} kWh); preserving household comfort.`;
      }
    } else {
      status = 'shifted';
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
      status,
      solarBenefitKWh: Number((shouldShift ? incrementalSolarBenefit : 0).toFixed(2)),
      gridReductionKWh: Number((shouldShift ? incrementalGridReduction : 0).toFixed(2)),
      comfortPenalty: Number((shouldShift ? bestCandidate.comfortPenalty : 0).toFixed(2)),
      tariffSaving: shouldShift ? tariffSaving : 0,
      score: Number((shouldShift ? bestCandidate.score : normalEval.score).toFixed(2)),
      confidence: forecastConfidence,
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
      status: 'fixed',
      solarBenefitKWh: 0,
      gridReductionKWh: 0,
      comfortPenalty: 0,
      tariffSaving: 0,
      score: 1.0,
      confidence: forecastConfidence,
      reason: 'Fixed appliance. Must remain at user-configured schedule.',
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
