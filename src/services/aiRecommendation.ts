import { ImpactSummary } from '../models/impact';

export interface AIExplanationResult {
  headline: string;
  summaryParagraph: string;
  keyInsights: string[];
  actionableGuidance: string[];
  confidenceAssessment: string;
  source: 'gemini-live' | 'deterministic-fallback';
}

/**
 * Deterministic explanation generator if the server endpoint or Gemini API is not reachable.
 */
function generateDeterministicExplanation(impact: ImpactSummary): AIExplanationResult {
  const shiftedDecisions = impact.applianceDecisions.filter((d) => d.changed);
  const unshiftedDecisions = impact.applianceDecisions.filter((d) => !d.changed);
  const confidence = impact.forecast.forecastConfidence;

  let headline = '';
  let summaryParagraph = '';

  if (shiftedDecisions.length === 0) {
    headline = 'Existing Schedule Already Optimal';
    summaryParagraph =
      'The optimizer determined that your current appliance schedule aligns well with your solar generation pattern, or that the potential solar gain from shifting would be outweighed by occupancy and comfort penalties. No schedule changes are required for tomorrow.';
  } else {
    headline = `Optimized ${shiftedDecisions.length} Flexible Appliance${shiftedDecisions.length > 1 ? 's' : ''} to Daytime Solar Peak`;
    summaryParagraph = `By aligning high-draw appliances into tomorrow's solar generation window (${impact.forecast.usefulSolarWindow.startHour}:00 - ${impact.forecast.usefulSolarWindow.endHour}:00), the household increases direct solar self-consumption from ${impact.normalSelfConsumptionPct}% to ${impact.optimizedSelfConsumptionPct}%, avoiding ${impact.gridReductionKWh} kWh of grid import.`;
  }

  const keyInsights: string[] = [];

  shiftedDecisions.forEach((d) => {
    const dir = d.shiftHours > 0 ? `forward by ${d.shiftHours}h` : `earlier by ${Math.abs(d.shiftHours)}h`;
    keyInsights.push(
      `${d.applianceName}: Shifted ${dir} to start at ${d.optimizedStartHour}:00 (duration ${d.durationHours}h, ${d.powerKW} kW). This captures +${d.solarBenefitKWh} kWh of solar that would otherwise be exported or curtailed.`
    );
  });

  unshiftedDecisions.forEach((d) => {
    if (d.applianceName !== 'Standby & Baseline') {
      keyInsights.push(
        `${d.applianceName}: Maintained at normal ${d.normalStartHour}:00. Reason: ${d.reason}`
      );
    }
  });

  const actionableGuidance: string[] = [];
  if (shiftedDecisions.length > 0) {
    actionableGuidance.push(
      `Set appliance delayed-start timers before leaving the house to match the suggested hours.`
    );
    actionableGuidance.push(
      `Avoid running heavy appliances simultaneously during peak solar hours if you exceed rooftop inverter capacity.`
    );
  } else {
    actionableGuidance.push(
      `Maintain your current routine; shifting appliances today offers negligible energy or cost benefit.`
    );
  }

  const confidenceAssessment = `Forecast Confidence is ${confidence.toUpperCase()}: Based on tomorrow's estimated ${impact.forecast.totalSolarGenerationKWh} kWh expected generation with ${impact.forecast.usefulSolarWindow.peakKW} kW midday peak. The confidence interval spans ${impact.forecast.confidenceLowerTotal} kWh to ${impact.forecast.confidenceUpperTotal} kWh.`;

  return {
    headline,
    summaryParagraph,
    keyInsights,
    actionableGuidance,
    confidenceAssessment,
    source: 'deterministic-fallback',
  };
}

/**
 * Requests server-side Gemini explanation for the computed optimization impact.
 */
export async function getAIOptimizationExplanation(
  impact: ImpactSummary
): Promise<AIExplanationResult> {
  // Extract strictly the factual numerical payload
  const payload = {
    forecast: {
      date: impact.forecast.date,
      location: impact.forecast.locationName,
      totalSolarGenerationKWh: impact.forecast.totalSolarGenerationKWh,
      confidenceLowerTotal: impact.forecast.confidenceLowerTotal,
      confidenceUpperTotal: impact.forecast.confidenceUpperTotal,
      usefulWindow: impact.forecast.usefulSolarWindow,
      forecastConfidence: impact.forecast.forecastConfidence,
      weatherSummary: impact.forecast.weatherSummary,
    },
    metrics: {
      normalSelfConsumptionPct: impact.normalSelfConsumptionPct,
      optimizedSelfConsumptionPct: impact.optimizedSelfConsumptionPct,
      selfConsumptionGainPctPoints: impact.selfConsumptionGainPctPoints,
      normalGridImportKWh: impact.normalGridImportKWh,
      optimizedGridImportKWh: impact.optimizedGridImportKWh,
      gridReductionKWh: impact.gridReductionKWh,
      potentialCostImpactINR: impact.potentialCostImpactINR,
      co2AvoidedKg: impact.co2AvoidedKg,
      shiftedCount: impact.shiftedAppliancesCount,
      totalCount: impact.totalAppliancesCount,
    },
    decisions: impact.applianceDecisions.map((d) => ({
      name: d.applianceName,
      powerKW: d.powerKW,
      durationHours: d.durationHours,
      normalStart: d.normalStartHour,
      optimizedStart: d.optimizedStartHour,
      shiftHours: d.shiftHours,
      changed: d.changed,
      solarBenefitKWh: d.solarBenefitKWh,
      gridReductionKWh: d.gridReductionKWh,
      reason: d.reason,
    })),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('/api/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data.explanation) {
      return {
        ...data.explanation,
        source: 'gemini-live',
      };
    }
    return generateDeterministicExplanation(impact);
  } catch {
    // If backend or Gemini is unreachable, use clean deterministic explanation
    return generateDeterministicExplanation(impact);
  }
}
