import React, { useState } from 'react';
import { SolarForecastResult } from '../../models/forecast';
import { generateSolarMonitoring } from '../../engines/solarMonitoring';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sun,
  Zap,
  Info,
} from 'lucide-react';

interface SolarMonitorViewProps {
  forecast: SolarForecastResult;
}

export const SolarMonitorView: React.FC<SolarMonitorViewProps> = ({ forecast }) => {
  const [condition, setCondition] = useState<'cloudy_dip' | 'normal' | 'high_performance'>('cloudy_dip');

  const monitoring = generateSolarMonitoring(forecast, condition);

  const formatHour12 = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  // SVG dimensions
  const svgWidth = 760;
  const svgHeight = 220;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const graphWidth = svgWidth - pad.left - pad.right;
  const graphHeight = svgHeight - pad.top - pad.bottom;

  const maxVal = Math.max(
    ...monitoring.hourly.map((h) => Math.max(h.expectedKWh, h.actualKWh)),
    1.0
  );
  const maxY = Math.ceil(maxVal * 1.15);

  const getX = (h: number) => pad.left + (h / 23) * graphWidth;
  const getY = (val: number) => pad.top + graphHeight - (Math.max(0, val) / maxY) * graphHeight;

  // Expected curve path
  const expectedLinePath = monitoring.hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.expectedKWh)}`)
    .join(' ');

  // Actual curve path
  const actualLinePath = monitoring.hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.actualKWh)}`)
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Solar Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            What happened today? Comparing expected forecast against inverter output.
          </p>
        </div>

        {/* Demo Telemetry Simulator Switcher */}
        <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl p-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 px-2">Feed Scenario:</span>
          <button
            type="button"
            onClick={() => setCondition('cloudy_dip')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              condition === 'cloudy_dip'
                ? 'bg-amber-500 text-white font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Afternoon Cloud Dip
          </button>
          <button
            type="button"
            onClick={() => setCondition('normal')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              condition === 'normal'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nominal Clear
          </button>
        </div>
      </div>

      {/* Simulated Telemetry Badge Banner */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Simulated Inverter Feed:</strong> Displaying realistic telemetry telemetry points benchmarked against your array capacity ({forecast.panelCapacityKW} kW).
          </span>
        </span>
      </div>

      {/* KPI Cards: Expected, Actual, Performance %, Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Expected Generation
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {monitoring.totalExpectedKWh}
            </span>
            <span className="text-xs text-slate-500 font-semibold">kWh</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Solar declination model baseline
          </span>
        </div>

        {/* Actual */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Actual Generation
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-emerald-700 font-mono">
              {monitoring.totalActualKWh}
            </span>
            <span className="text-xs text-slate-500 font-semibold">kWh</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Inverter recorded yield
          </span>
        </div>

        {/* Performance % */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Performance Ratio
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-3xl font-extrabold font-mono ${
                monitoring.performanceRatioPct >= 95
                  ? 'text-emerald-600'
                  : monitoring.performanceRatioPct >= 85
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {monitoring.performanceRatioPct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            Actual vs expected ratio
          </span>
        </div>

        {/* Status Flag */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Underperformance Flag
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {monitoring.statusFlag === 'on_track' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  On Track
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Slight Underperformance
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-tight">
            {monitoring.statusMessage}
          </p>
        </div>
      </div>

      {/* Hourly Comparison Chart */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Expected vs. Actual Generation Profile
            </h2>
            <p className="text-xs text-slate-500">
              Golden line: Expected forecast. Green line: Inverter output readings.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-500 rounded-full" />
              <span className="text-slate-600">Expected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-600 rounded-full" />
              <span className="text-emerald-700">Actual (Inverter)</span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[560px] select-none">
            {/* Grid */}
            {[0, 0.5, 1.0].map((frac) => {
              const val = frac * maxY;
              const y = getY(val);
              return (
                <g key={frac}>
                  <line x1={pad.left} y1={y} x2={svgWidth - pad.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                    {val.toFixed(1)}k
                  </text>
                </g>
              );
            })}

            {/* Expected Line (Golden) */}
            <path
              d={expectedLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />

            {/* Actual Line (Emerald Green) */}
            <path
              d={actualLinePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Actual point dots */}
            {monitoring.hourly.map((pt) => {
              if (pt.actualKWh <= 0.05) return null;
              const x = getX(pt.hour);
              const y = getY(pt.actualKWh);
              const isDip = pt.status === 'cloud_dip';

              return (
                <g key={pt.hour}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isDip ? 4 : 3}
                    fill={isDip ? '#f59e0b' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

            {/* X-axis labels */}
            {[6, 9, 12, 15, 18, 21].map((h) => (
              <text
                key={h}
                x={getX(h)}
                y={pad.top + graphHeight + 15}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
                fontFamily="monospace"
              >
                {formatHour12(h)}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
