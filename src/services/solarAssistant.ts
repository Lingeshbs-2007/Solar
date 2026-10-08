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
 * Deterministic fallback responses when AI server is unreachable or offline.
 */
function getDeterministicAnswer(question: string, impact: ImpactSummary | null): string {
  const q = question.toLowerCase();

  if (q.includes('washing machine') || q.includes('afternoon') || q.includes('why should i run')) {
    const shifted = impact?.applianceDecisions.find((d) => d.changed);
    if (shifted) {
      return `Moving ${shifted.applianceName} to ${shifted.optimizedStartHour}:00 aligns its ${shifted.powerKW} kW draw directly with peak solar irradiance (${impact?.forecast.usefulSolarWindow.startHour}:00 - ${impact?.forecast.usefulSolarWindow.endHour}:00). This captures +${shifted.solarBenefitKWh} kWh of clean solar rather than buying grid electricity at normal evening rates.`;
    }
    return `Running flexible appliances like washing machines during peak daylight (11 AM - 3 PM) lets them consume rooftop solar energy directly rather than pulling power from the grid during expensive evening peak hours.`;
  }

  if (q.includes('lower') || q.includes('weather') || q.includes('cloud')) {
    const cloud = impact?.forecast.weatherSummary;
    return `Tomorrow's forecasted solar output is influenced by local cloud cover and irradiance. ${cloud || 'Scattered clouds reduce peak direct sunlight, so the optimizer schedules loads conservatively during the clearest midday hours.'}`;
  }

  if (q.includes('self-consumption') || q.includes('what does')) {
    const pct = impact?.optimizedSelfConsumptionPct || 70;
    return `Solar self-consumption is the percentage of rooftop solar energy consumed on-site by your appliances rather than exported to the grid. In your plan, self-consumption is projected at ${pct}%. Using solar directly is significantly more valuable than selling it back at low feed-in tariffs.`;
  }

  if (q.includes('improve') || q.includes('tips') || q.includes('usage')) {
    return `To maximize your solar efficiency: (1) Use appliance delay timers to align laundry and dishwashing between 11 AM and 3 PM; (2) Avoid running multiple heavy appliances simultaneously to prevent exceeding your inverter limit; (3) Check for roof shading around midday.`;
  }

  return `Based on tomorrow's solar forecast of ${impact?.forecast.totalSolarGenerationKWh || 14} kWh, the best strategy is shifting flexible appliances into the ${impact?.forecast.usefulSolarWindow.startHour || 11}:00 to ${impact?.forecast.usefulSolarWindow.endHour || 16}:00 window, boosting clean self-consumption to ${impact?.optimizedSelfConsumptionPct || 72}%.`;
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
    return getDeterministicAnswer(question, impact);
  } catch {
    return getDeterministicAnswer(question, impact);
  }
}
