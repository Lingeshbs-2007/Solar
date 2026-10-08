import { SolarForecastResult } from '../models/forecast';
import { HourlyMonitoringPoint, MonitoringSummary, InverterStatus } from '../models/monitoring';

/**
 * Generates solar monitoring performance data comparing expected forecast vs actual inverter generation.
 * When real inverter telemetry is not connected, creates deterministic realistic simulated inverter data.
 */
export function generateSolarMonitoring(
  forecast: SolarForecastResult,
  inverterCondition: 'normal' | 'cloudy_dip' | 'high_performance' = 'cloudy_dip'
): MonitoringSummary {
  const hourly: HourlyMonitoringPoint[] = [];
  let totalExpected = 0;
  let totalActual = 0;

  forecast.hourly.forEach((pt) => {
    const exp = pt.solarGenerationKWh;
    totalExpected += exp;

    if (exp <= 0.05) {
      hourly.push({
        hour: pt.hour,
        expectedKWh: 0,
        actualKWh: 0,
        deltaKWh: 0,
        performancePct: 100,
        status: 'normal',
      });
      return;
    }

    // Realistic simulated inverter variance
    let factor = 0.94; // base clean array factor (~94% of STC clear model)
    let status: InverterStatus = 'normal';
    let note: string | undefined;

    if (inverterCondition === 'cloudy_dip') {
      // Simulate transient passing cloud drop between 13:00 and 15:00
      if (pt.hour === 13) {
        factor = 0.72;
        status = 'cloud_dip';
        note = 'Passing cumulus cloud event';
      } else if (pt.hour === 14) {
        factor = 0.78;
        status = 'cloud_dip';
        note = 'Scattered cloud cover';
      } else if (pt.hour === 12) {
        factor = 0.96;
      }
    } else if (inverterCondition === 'high_performance') {
      factor = 1.02;
    }

    const actual = Number((exp * factor).toFixed(2));
    totalActual += actual;
    const delta = Number((actual - exp).toFixed(2));
    const perfPct = exp > 0 ? Number(((actual / exp) * 100).toFixed(1)) : 100;

    hourly.push({
      hour: pt.hour,
      expectedKWh: exp,
      actualKWh: actual,
      deltaKWh: delta,
      performancePct: perfPct,
      status,
      note,
    });
  });

  totalExpected = Number(totalExpected.toFixed(2));
  totalActual = Number(totalActual.toFixed(2));
  const overallRatio = totalExpected > 0 ? Number(((totalActual / totalExpected) * 100).toFixed(1)) : 100;

  let statusFlag: MonitoringSummary['statusFlag'] = 'on_track';
  let statusMessage = 'Generation is aligned with solar model expectation.';

  if (overallRatio < 88) {
    statusFlag = 'slight_underperformance';
    statusMessage = 'Generation is slightly below expected due to afternoon cloud extinction.';
  } else if (overallRatio > 98) {
    statusFlag = 'exceeding_expectation';
    statusMessage = 'Array output exceeded nominal forecast under exceptionally clear skies.';
  }

  return {
    date: forecast.date,
    totalExpectedKWh: totalExpected,
    totalActualKWh: totalActual,
    performanceRatioPct: overallRatio,
    statusFlag,
    statusMessage,
    hourly,
    isSimulatedInverterData: true,
  };
}
