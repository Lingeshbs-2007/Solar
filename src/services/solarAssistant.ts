import { ImpactSummary } from '../models/impact';
import { HouseholdConfig } from '../models/household';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const SUGGESTED_QUESTIONS = [
  'Why is my solar generation lower today?',
  'Why should I run my washing machine in the afternoon?',
  'What does solar self-consumption mean?',
  'How can I improve my solar usage?',
];

/**
 * Deterministic fallback responses grounded strictly in current application state.
 * Never invents fake numbers or unsupported inverter claims.
 */
function getDeterministicAnswer(question: string, impact: ImpactSummary | null, household: HouseholdConfig): string {
  const q = question.toLowerCase();

  if (!impact) {
    return 'I do not have an optimization plan yet. Click "Generate Tomorrow\'s Plan" first to calculate your solar forecast and personalized appliance recommendations.';
  }

  const { forecast, applianceDecisions, optimizedSelfConsumptionPct, normalSelfConsumptionPct, gridReductionKWh } = impact;
  const solarWindowStr = `${forecast.usefulSolarWindow.startHour}:00 - ${forecast.usefulSolarWindow.endHour}:00`;

  if (q.includes('washing machine') || q.includes('afternoon') || q.includes('why should i run') || q.includes('appliance')) {
    const shifted = applianceDecisions.find((d) => d.changed);
    if (shifted) {
      return `Moving ${shifted.applianceName} to start at ${shifted.optimizedStartHour}:00 aligns its ${shifted.powerKW} kW draw directly with tomorrow's predicted solar window (${solarWindowStr}). This directly supplies +${shifted.solarBenefitKWh} kWh from rooftop solar and reduces grid import.`;
    }
    return `Your appliances are already scheduled in optimal or fixed hours. For any flexible appliance, operating inside your solar window (${solarWindowStr}) allows clean self-consumption rather than grid import.`;
  }

  if (q.includes('lower') || q.includes('weather') || q.includes('cloud')) {
    return `Tomorrow's forecasted solar output for ${household.location.name} is ${forecast.totalSolarGenerationKWh} kWh with ${forecast.forecastConfidence} confidence. ${forecast.weatherSummary}`;
  }

  if (q.includes('self-consumption') || q.includes('what does')) {
    return `Solar self-consumption is the fraction of rooftop solar electricity used directly by your home rather than exported to the grid. In your plan, self-consumption increases from ${normalSelfConsumptionPct}% to ${optimizedSelfConsumptionPct}%, maximizing value since direct solar use offsets utility tariffs.`;
  }

  if (q.includes('grid') || q.includes('reduce') || q.includes('savings')) {
    return `Following tomorrow's recommended schedule reduces your grid electricity import by an estimated ${gridReductionKWh} kWh (from ${impact.normalGridImportKWh} kWh down to ${impact.optimizedGridImportKWh} kWh).`;
  }

  if (q.includes('improve') || q.includes('tips') || q.includes('usage')) {
    return `To maximize solar utilization: (1) Use appliance delay-start timers to target the solar window (${solarWindowStr}); (2) Ensure appliances requiring occupancy run when family members are home; (3) Check panel cleanliness before high-irradiance days.`;
  }

  return `Based on tomorrow's forecast of ${forecast.totalSolarGenerationKWh} kWh for your ${household.panelCapacityKW} kW array, running flexible loads during the solar window (${solarWindowStr}) optimizes clean self-consumption to ${optimizedSelfConsumptionPct}%.`;
}

export async function askSolarAssistant(
  question: string,
  impact: ImpactSummary | null,
  household: HouseholdConfig
): Promise<string> {
  const context = impact
    ? {
        location: household.location.name,
        panelCapacityKW: household.panelCapacityKW,
        date: impact.forecast.date,
        totalSolarGenerationKWh: impact.forecast.totalSolarGenerationKWh,
        peakHour: impact.forecast.peakGenerationHour,
        usefulSolarWindow: impact.forecast.usefulSolarWindow,
        forecastConfidence: impact.forecast.forecastConfidence,
        weatherSummary: impact.forecast.weatherSummary,
        selfConsumption: {
          normal: impact.normalSelfConsumptionPct,
          optimized: impact.optimizedSelfConsumptionPct,
        },
        gridReductionKWh: impact.gridReductionKWh,
        shiftedAppliances: impact.applianceDecisions
          .filter((d) => d.changed)
          .map((d) => ({
            name: d.applianceName,
            normal: `${d.normalStartHour}:00`,
            optimized: `${d.optimizedStartHour}:00`,
            solarBenefitKWh: d.solarBenefitKWh,
            reason: d.reason,
          })),
      }
    : null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    if (data.answer) {
      return data.answer;
    }
    return getDeterministicAnswer(question, impact, household);
  } catch {
    return getDeterministicAnswer(question, impact, household);
  }
}
