export type InverterStatus = 'normal' | 'cloud_dip' | 'inverter_clipping' | 'underperforming';

export interface HourlyMonitoringPoint {
  hour: number;
  expectedKWh: number;
  actualKWh: number;
  deltaKWh: number;
  performancePct: number;
  status: InverterStatus;
  note?: string;
}

export interface MonitoringSummary {
  date: string;
  totalExpectedKWh: number;
  totalActualKWh: number;
  performanceRatioPct: number;
  statusFlag: 'on_track' | 'slight_underperformance' | 'exceeding_expectation';
  statusMessage: string;
  hourly: HourlyMonitoringPoint[];
  isSimulatedInverterData: boolean;
}
