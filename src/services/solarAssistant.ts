import { ImpactSummary } from '../models/impact';
import { HouseholdConfig } from '../models/household';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const SUGGESTED_QUESTIONS = [
  'How do solar panels convert sunlight into electricity?',
  'What is the difference between monocrystalline and polycrystalline panels?',
  'How do string inverters compare to microinverters?',
  'How does cloudy or rainy weather affect solar panel output?',
  'How often should rooftop solar panels be cleaned and maintained?',
  'What is solar panel degradation and typical lifespan?',
  'How does net metering work with rooftop solar systems?',
  'Can I add a battery storage system to my grid-connected solar setup?',
];

/**
 * Deterministic fallback responses covering general solar questions,
 * photovoltaic technology, maintenance, economics, inverters, and storage.
 */
function getDeterministicAnswer(
  question: string,
  impact: ImpactSummary | null,
  household: HouseholdConfig
): string {
  const q = question.toLowerCase();

  // Explicit user inquiry about their own home schedule or tomorrow
  if ((q.includes('my schedule') || q.includes('my house') || q.includes('my appliances') || q.includes('tomorrow\'s plan') || q.includes('my generation')) && impact) {
    const shifted = impact.applianceDecisions.filter((d) => d.changed);
    const windowStr = `${impact.forecast.usefulSolarWindow.startHour}:00 - ${impact.forecast.usefulSolarWindow.endHour}:00`;
    return `For your ${household.panelCapacityKW} kW rooftop system in ${household.location.name}:
• Forecasted solar production tomorrow: ${impact.forecast.totalSolarGenerationKWh} kWh (Peak at ${impact.forecast.peakGenerationHour}:00).
• High-generation solar window: ${windowStr}.
• Shifted appliances: ${shifted.length > 0 ? shifted.map((s) => `${s.applianceName} (moved to ${s.optimizedStartHour}:00)`).join(', ') : 'None, current timings are already optimal'}.
• Self-consumption increases to ${impact.optimizedSelfConsumptionPct}% (${impact.gridReductionKWh} kWh grid import avoided).`;
  }

  // 1. How solar panels work / Photovoltaic effect
  if (q.includes('how do solar') || q.includes('how does it work') || q.includes('photovoltaic') || q.includes('convert sunlight') || q.includes('pv effect')) {
    return `Solar panels generate electricity through the Photovoltaic (PV) Effect:
1. Silicon Solar Cells: Solar panels consist of silicon semiconductor cells treated with positive (p-type) and negative (n-type) layers to create an internal electric field.
2. Photon Absorption: When sunlight (photons) strikes the cell, it transfers energy to valence electrons, knocking them free from silicon atoms.
3. Electric Current: The internal electric field forces these energized free electrons to flow through metal conductive contacts, creating Direct Current (DC) electricity.
4. Power Inversion: The DC electricity travels to an inverter, which transforms it into synchronized 230V/120V Alternating Current (AC) electricity ready to power home appliances or feed back into the electrical grid.`;
  }

  // 2. Monocrystalline vs Polycrystalline vs Thin-Film vs Bifacial
  if (q.includes('monocrystalline') || q.includes('polycrystalline') || q.includes('thin-film') || q.includes('bifacial') || q.includes('type of panel') || q.includes('panel type')) {
    return `Here is a breakdown of common solar panel technologies:
• Monocrystalline (Mono-PERC / TOPCon): Manufactured from single-crystal pure silicon. Characterized by sleek uniform black cells. Highest efficiency (20%–23%), superior performance in high temperatures and low light, and the current residential standard.
• Polycrystalline: Made by melting multiple silicon fragments together. Recognizable by their speckled blue hue. Lower efficiency (15%–17%), requiring more roof area for the same wattage; largely phased out for modern rooftop installations.
• Bifacial Panels: Feature transparent glass backsheets capable of capturing sunlight from both the front and reflected light (albedo) from the rear, increasing yields by 10%–25% on reflective surfaces.
• Thin-Film: Lightweight and flexible, but lower efficiency (11%–13%); primarily used for specialized commercial roofs or portable setups.`;
  }

  // 3. Inverters: String vs Microinverters vs Hybrid
  if (q.includes('inverter') || q.includes('string') || q.includes('microinverter') || q.includes('mppt') || q.includes('central inverter')) {
    return `Solar inverters convert direct current (DC) from panels into usable alternating current (AC) for household appliances:
• String Inverters: Panels are wired in series ('strings') connected to a single central inverter. Very cost-effective, durable, and easy to maintain. However, if one panel in a string suffers heavy shading, the output of that entire string can drop.
• Microinverters: Small individual inverters attached beneath each solar panel. They perform independent Maximum Power Point Tracking (MPPT) per panel. Ideal for complex roof layouts, multi-directional orientations, or partial tree shading.
• Hybrid Inverters: Feature integrated solar PV and battery management electronics in a single enclosure, allowing seamless integration of lithium battery storage without extra conversion hardware.`;
  }

  // 4. Weather: Clouds, Rain, Fog, Snow
  if (q.includes('rain') || q.includes('cloud') || q.includes('fog') || q.includes('overcast') || q.includes('weather') || q.includes('snow') || q.includes('winter')) {
    return `How weather conditions affect solar panels:
• Overcast & Cloudy Skies: Solar panels do not require direct, blazing sunshine to function—they absorb both direct beam radiation and diffuse ambient daylight. On cloudy days, output typically drops to 15%–35% of peak rated capacity depending on cloud density.
• Rain: Rain does not hurt solar panels (they are IP67/IP68 weather-sealed). In fact, rainwater actively washes away accumulated surface dust, soot, and pollen, naturally improving subsequent electrical output.
• High Heat: Contrary to common belief, extreme ambient heat slightly reduces solar cell efficiency. Panels are rated at 25°C (77°F); for every degree above that, output decreases by roughly 0.35% to 0.45% (known as the Temperature Coefficient).
• Snow: Light snow melts quickly off dark, tilted glass surfaces; heavy snow covers output temporarily until it slides off.`;
  }

  // 5. Cleaning & Maintenance
  if (q.includes('clean') || q.includes('wash') || q.includes('dust') || q.includes('maintenance') || q.includes('dirt') || q.includes('soiling')) {
    return `Maintenance and cleaning guidelines for rooftop solar panels:
• Frequency: In standard residential areas, cleaning 2 to 4 times a year is sufficient. In dusty, arid, or heavy traffic areas, monthly or bi-monthly cleaning may be beneficial. Soiling losses can reduce generation by 5% to 15% if left uncleaned.
• Best Method: Rinse panels early in the morning or late in the afternoon when panels are cool to avoid thermal stress cracks. Use clean water and a soft microfiber brush or squeegee.
• Precautions: Never use harsh chemical abrasives, high-pressure pressure washers, or walk directly on panels, as micro-cracks in the silicon wafers can degrade performance over time.`;
  }

  // 6. Lifespan, Degradation, & Warranties
  if (q.includes('lifespan') || q.includes('degradation') || q.includes('warranty') || q.includes('how long do') || q.includes('life')) {
    return `Solar panel longevity and degradation:
• Lifespan: High-quality Tier-1 solar panels typically last 25 to 30+ years, with many systems continuing to produce clean electricity well beyond 30 years.
• Degradation Rate: Solar panels experience modest natural degradation of about 0.5% per year. Most reputable manufacturers provide a 25-year performance warranty guaranteeing at least 80%–85% of rated power at Year 25.
• Inverter Lifespan: String inverters typically have a lifespan of 10–15 years and may need replacement once during the system's life, whereas microinverters often feature 20–25 year warranties.`;
  }

  // 7. Battery Storage (BESS)
  if (q.includes('battery') || q.includes('storage') || q.includes('powerwall') || q.includes('backup') || q.includes('off-grid') || q.includes('hybrid')) {
    return `Adding battery storage to a solar energy system:
• Role of Batteries: Batteries store excess solar energy generated during midday for use during evening peak hours or during utility grid outages.
• AC-Coupled vs DC-Coupled: 
  - AC-coupled batteries can be retrofitted onto any existing solar system without modifying the existing inverter.
  - DC-coupled batteries connect directly behind a hybrid inverter with higher round-trip efficiency (90%–95%).
• Battery Chemistry: Lithium Iron Phosphate (LiFePO4) is the industry standard for home energy storage due to its exceptional thermal safety, long cycle life (6,000+ cycles), and non-toxic chemistry.`;
  }

  // 8. Net Metering, Grid Interconnection & Tariffs
  if (q.includes('net metering') || q.includes('feed-in') || q.includes('export') || q.includes('grid') || q.includes('meter')) {
    return `Understanding Net Metering & Grid Connection:
• Net Metering: A bi-directional billing mechanism that credits solar homeowners for electricity they send back to the grid. When your solar generates more electricity than your home consumes, the meter spins backward (or counts export units).
• Self-Consumption vs Export: Retail grid electricity tariffs are almost always higher than the feed-in tariff or export credit granted by utilities. Therefore, using your solar power directly inside the home (self-consumption) provides significantly higher financial return than exporting surplus power to the grid.`;
  }

  // 9. Tilt Angle, Orientation & Shading
  if (q.includes('angle') || q.includes('tilt') || q.includes('direction') || q.includes('orientation') || q.includes('shading') || q.includes('south')) {
    return `Solar panel orientation and angle fundamentals:
• Hemisphere Orientation: In the Northern Hemisphere, panels should face true South to maximize annual energy yield. In the Southern Hemisphere, panels should face true North. East- and West-facing panels also perform well, spreading production into early morning or late afternoon.
• Tilt Angle: The optimal tilt angle typically equals the local geographic latitude (e.g., 15° to 30° across India and tropical/subtropical regions).
• Shading: Even partial shade from a nearby tree or chimney on a single cell can restrict the flow of current through an entire bypass diode section. Shading analysis and microinverters/optimizers help mitigate this.`;
  }

  // 10. Cost, Payback, ROI & Sizing
  if (q.includes('cost') || q.includes('price') || q.includes('payback') || q.includes('roi') || q.includes('investment') || q.includes('size')) {
    return `Economics and sizing of rooftop solar:
• Sizing Rule-of-Thumb: 1 kW of rooftop solar panels requires roughly 80–100 sq. ft. of unshaded roof space and produces approximately 4 to 4.5 kWh of clean electricity per day (depending on location and season).
• Payback Period: In most regions with favorable net metering and typical grid electricity tariffs, residential rooftop solar systems achieve a full payback period in 3 to 5 years.
• Long-Term Savings: Because panels last 25+ years, systems provide 20+ years of virtually free, inflation-proof electricity after the initial payback period!`;
  }

  // 11. General comprehensive solar fallback
  return `Solar photovoltaic (PV) systems generate clean, sustainable electricity by converting sunlight directly into electricity via silicon semiconductor cells. 

Key aspects of solar systems include:
• PV Panels: Monocrystalline cells (20%–22% efficiency) absorb both direct and diffuse daylight.
• Inverter: Converts DC electricity to AC power synchronized with your home.
• Smart Load Scheduling: Running appliances during sunny midday hours maximizes free self-consumption and minimizes expensive grid imports.
• Net Metering: Credits homeowners for excess generation exported to the utility grid.

Feel free to ask me about panel types, inverters, battery storage, cleaning methods, installation angles, degradation, or any other solar technology questions!`;
}

export async function askSolarAssistant(
  question: string,
  impact: ImpactSummary | null,
  household: HouseholdConfig,
  history?: ChatMessage[]
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
      }
    : {
        location: household.location.name,
        panelCapacityKW: household.panelCapacityKW,
      };

  const formattedHistory = (history || [])
    .filter((m) => m.id !== 'welcome')
    .slice(-4)
    .map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text,
    }));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context, history: formattedHistory }),
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
  } catch (err: any) {
    console.warn('Live assistant query fallback:', err);
    return getDeterministicAnswer(question, impact, household);
  }
}
