import React, { useState } from 'react';
import { ImpactSummary } from '../../models/impact';
import { SolarForecastResult } from '../../models/forecast';
import {
  Sun,
  Zap,
  ArrowDownToLine,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Search,
  Cpu,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';

interface DashboardViewProps {
  impact: ImpactSummary;
  forecast: SolarForecastResult;
  isPlanStale: boolean;
  isGeneratingPlan: boolean;
  generationStage: string | null;
  onGeneratePlan: () => void;
  onGoToOptimize: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  impact,
  forecast,
  isPlanStale,
  isGeneratingPlan,
  generationStage,
  onGeneratePlan,
  onGoToOptimize,
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(forecast.peakGenerationHour);

  // Time greeting
  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening';

  // Format peak hour to 12h format
  const formatHour12 = (h: number) => {
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
  };

  // Total daily expected demand
  const totalDailyDemandKWh = Number(
    impact.optimizedHourly.reduce((sum, h) => sum + h.totalDemandKWh, 0).toFixed(1)
  );

  // Useful solar window string derived dynamically from forecast
  const solarWindowStr = `${formatHour12(forecast.usefulSolarWindow.startHour)} – ${formatHour12(
    forecast.usefulSolarWindow.endHour
  )}`;

  // SVG Chart Dimensions
  const svgWidth = 820;
  const svgHeight = 240;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const maxSolar = Math.max(...forecast.hourly.map((h) => h.solarGenerationKWh), 1.0);
  const maxDemand = Math.max(...impact.optimizedHourly.map((h) => h.totalDemandKWh), 1.0);
  const maxY = Math.ceil(Math.max(maxSolar, maxDemand, 3.0) * 1.15);

  const getX = (h: number) => padding.left + (h / 23) * graphWidth;
  const getY = (val: number) => padding.top + graphHeight - (Math.max(0, val) / maxY) * graphHeight;

  // Paths
  const solarLinePath = forecast.hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.solarGenerationKWh)}`)
    .join(' ');

  const demandLinePath = impact.optimizedHourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.totalDemandKWh)}`)
    .join(' ');

  const activeDemandPt = hoveredHour !== null ? impact.optimizedHourly[hoveredHour] : null;
  const activeSolarPt = hoveredHour !== null ? forecast.hourly[hoveredHour] : null;

  return (
    <div className="space-y-6">
      {/* Stale Plan Alert Banner */}
      {isPlanStale && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Plan needs regeneration
              </h4>
              <p className="text-[11px] text-amber-800/90">
                Your household or appliance settings have changed. Generate a new plan to update the optimization results.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGeneratePlan}
            disabled={isGeneratingPlan}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
            <span>{isGeneratingPlan ? generationStage || 'Calculating...' : "Generate Tomorrow's Plan"}</span>
          </button>
        </div>
      )}

      {/* Top Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              {greeting}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Simulation Mode
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tomorrow&apos;s Solar Plan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Your personalized solar-use plan based on forecast and household demand.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onGeneratePlan}
            disabled={isGeneratingPlan}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
            <span>{isGeneratingPlan ? generationStage || 'Generating Plan...' : 'Generate Tomorrow\'s Plan'}</span>
          </button>

          <button
            type="button"
            onClick={onGoToOptimize}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <span>Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Staged Progress Indicator while generating plan */}
      {isGeneratingPlan && generationStage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-2 font-mono">
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>{generationStage}</span>
          </div>
          <span className="text-[11px] text-emerald-700">Real-time optimization engine active</span>
        </div>
      )}

      {/* Hero / Main Status Card: Tomorrow's Solar Opportunity */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700/50 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
              Tomorrow&apos;s Solar Opportunity
            </span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {forecast.totalSolarGenerationKWh} kWh Expected Generation
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Strongest solar window: <strong className="text-white font-mono">{solarWindowStr}</strong> ({forecast.usefulSolarWindow.peakKW} kW peak output).
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono backdrop-blur-xs">
            <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Confidence: <strong className="capitalize text-emerald-200">{forecast.forecastConfidence}</strong></span>
          </div>
        </div>

        {/* 4 Primary KPIs in Hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[10px] uppercase text-emerald-200 font-sans block">1. Solar Generation</span>
            <span className="text-2xl font-extrabold text-white">{forecast.totalSolarGenerationKWh}</span>
            <span className="text-xs text-emerald-300 ml-1">kWh</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[10px] uppercase text-emerald-200 font-sans block">2. Household Demand</span>
            <span className="text-2xl font-extrabold text-white">{totalDailyDemandKWh}</span>
            <span className="text-xs text-emerald-300 ml-1">kWh</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[10px] uppercase text-emerald-200 font-sans block">3. Grid Reduction</span>
            <span className="text-2xl font-extrabold text-emerald-300">-{impact.gridReductionKWh}</span>
            <span className="text-xs text-emerald-200 ml-1">kWh</span>
          </div>

          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-xs">
            <span className="text-[10px] uppercase text-emerald-200 font-sans block">4. Self-Consumption</span>
            <span className="text-2xl font-extrabold text-amber-300">{impact.optimizedSelfConsumptionPct}%</span>
            <span className="text-[10px] text-emerald-300 block font-sans">+{impact.selfConsumptionGainPctPoints}% gain</span>
          </div>
        </div>
      </div>

      {/* MAIN CHART: SOLAR vs HOUSEHOLD DEMAND with Mismatch Shading */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Solar vs. Household Demand Balance
            </h2>
            <p className="text-xs text-slate-500">
              Gold line: Predicted solar generation. Charcoal line: Household demand. Shaded zones show clean surplus opportunity vs grid import deficit.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-500 rounded-full" />
              <span className="text-slate-700">Solar Generation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-slate-700 rounded-full" />
              <span className="text-slate-700">Household Demand</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xs" />
              <span className="text-emerald-700">Surplus Window</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[620px] select-none">
            {/* Grid Lines */}
            {[0, 0.33, 0.66, 1.0].map((frac) => {
              const val = frac * maxY;
              const y = getY(val);
              return (
                <g key={frac}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {val.toFixed(1)} kW
                  </text>
                </g>
              );
            })}

            {/* Shaded Hourly Surplus and Shortage Zones */}
            {impact.optimizedHourly.map((pt) => {
              const sol = forecast.hourly[pt.hour]?.solarGenerationKWh || 0;
              const dem = pt.totalDemandKWh;
              const barWidth = (graphWidth / 24) * 0.72;
              const x = getX(pt.hour) - barWidth / 2;

              const isSurplus = sol > dem;
              const diffKWh = Math.abs(sol - dem);
              const diffHeight = (diffKWh / maxY) * graphHeight;
              const yTop = getY(Math.max(sol, dem));

              return (
                <g
                  key={pt.hour}
                  onMouseEnter={() => setHoveredHour(pt.hour)}
                  className="cursor-pointer"
                >
                  <rect
                    x={getX(pt.hour) - graphWidth / 48}
                    y={padding.top}
                    width={graphWidth / 24}
                    height={graphHeight}
                    fill={hoveredHour === pt.hour ? '#f8fafc' : 'transparent'}
                  />

                  {diffKWh > 0.08 && (
                    <rect
                      x={x}
                      y={yTop}
                      width={barWidth}
                      height={diffHeight}
                      fill={isSurplus ? '#10b981' : '#f43f5e'}
                      fillOpacity={isSurplus ? 0.22 : 0.12}
                      rx="2"
                    />
                  )}
                </g>
              );
            })}

            {/* Solar Generation Area/Line (Yellow) */}
            <path
              d={solarLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Household Demand Area/Line (Charcoal) */}
            <path
              d={demandLinePath}
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis tick marks */}
            {Array.from({ length: 24 }).map((_, h) => {
              const x = getX(h);
              const isMark = h % 3 === 0;
              return (
                <g key={h}>
                  <line
                    x1={x}
                    y1={padding.top + graphHeight}
                    x2={x}
                    y2={padding.top + graphHeight + 4}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  {isMark && (
                    <text
                      x={x}
                      y={padding.top + graphHeight + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#64748b"
                      fontFamily="monospace"
                      fontWeight={hoveredHour === h ? 'bold' : 'normal'}
                    >
                      {h < 10 ? `0${h}` : h}:00
                    </text>
                  )}
                </g>
              );
            })}

            {/* Active vertical cursor line */}
            {hoveredHour !== null && (
              <line
                x1={getX(hoveredHour)}
                y1={padding.top}
                x2={getX(hoveredHour)}
                y2={padding.top + graphHeight}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        </div>

        {/* Hover Inspector Tooltip Strip */}
        {activeDemandPt && activeSolarPt && hoveredHour !== null && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-3 font-mono">
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Hour Window</span>
              <span className="font-bold text-slate-800">
                {hoveredHour}:00 &ndash; {hoveredHour + 1}:00
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Solar Output</span>
              <span className="font-bold text-amber-600">{activeSolarPt.solarGenerationKWh.toFixed(2)} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Demand</span>
              <span className="font-bold text-slate-800">{activeDemandPt.totalDemandKWh.toFixed(2)} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Direct Solar Use</span>
              <span className="font-bold text-emerald-700">{activeDemandPt.directSolarUseKWh.toFixed(2)} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Grid Import</span>
              <span className="font-bold text-rose-600">{activeDemandPt.gridImportKWh.toFixed(2)} kWh</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans text-[11px] block">Status</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                  activeDemandPt.classification === 'SURPLUS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeDemandPt.classification === 'SHORTAGE'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeDemandPt.classification}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* HOW IT WORKS SECTION (Compact 4-Step Pipeline Summary) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          How SolarFlow Optimization Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px]">1</span>
              Forecast
            </span>
            <p className="text-[11px] text-slate-600">
              We query solar radiation & estimate tomorrow&apos;s rooftop generation with confidence bands.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px]">2</span>
              Analyze
            </span>
            <p className="text-[11px] text-slate-600">
              We compare solar availability with household demand to find clean surplus opportunity windows.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">3</span>
              Optimize
            </span>
            <p className="text-[11px] text-slate-600">
              Our greedy optimizer places flexible loads into solar hours respecting duration, comfort, and occupancy.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-[10px]">4</span>
              Measure
            </span>
            <p className="text-[11px] text-slate-600">
              We compare normal vs. optimized schedules to calculate self-consumption and grid reduction.
            </p>
          </div>
        </div>
      </div>

      {/* TOMORROW'S RECOMMENDED SCHEDULE (Compact Rows) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tomorrow&apos;s Recommended Schedule
            </h2>
            <p className="text-xs text-slate-500">
              Actionable appliance operating slots based on forecast solar surplus.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-mono">
            {impact.shiftedAppliancesCount} of {impact.totalAppliancesCount} recommended shift{impact.shiftedAppliancesCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {impact.applianceDecisions.map((decision) => {
            const normal12 = formatHour12(decision.normalStartHour);
            const opt12 = formatHour12(decision.optimizedStartHour);

            return (
              <div
                key={decision.applianceId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">
                    {decision.applianceName.toLowerCase().includes('wash')
                      ? '🧺'
                      : decision.applianceName.toLowerCase().includes('dish')
                      ? '🍽'
                      : decision.applianceName.toLowerCase().includes('water')
                      ? '🚿'
                      : decision.applianceName.toLowerCase().includes('ev')
                      ? '🚗'
                      : '⚡'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{decision.applianceName}</span>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>{decision.powerKW} kW</span>
                      <span>&bull;</span>
                      <span>{decision.durationHours} hr runtime</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  {decision.status === 'shifted' ? (
                    <>
                      <div className="font-mono text-xs flex items-center gap-1.5">
                        <span className="text-slate-400 line-through">{normal12}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          {opt12}
                        </span>
                      </div>
                      <span className="text-emerald-700 font-mono font-semibold">
                        +{decision.solarBenefitKWh} kWh solar use
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Recommended
                      </span>
                    </>
                  ) : decision.status === 'no-feasible-schedule' ? (
                    <>
                      <div className="font-mono text-xs text-slate-600">
                        <span>{normal12}</span>
                      </div>
                      <span className="text-amber-700 font-medium text-[11px]">
                        No feasible window
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Constrained
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-xs text-slate-600">
                        <span>{normal12}</span>
                      </div>
                      <span className="text-slate-500 font-medium">
                        No change needed
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {decision.status === 'fixed' ? 'Fixed' : 'Optimal'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BEFORE VS AFTER: Compact Visual Comparison Cards */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Before vs. After Impact Comparison
          </h2>
          <span className="text-xs text-slate-500">Same simulation day comparison</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Solar Self-Consumption */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Solar Self-Consumption</span>
              <span className="text-emerald-700 font-bold font-mono">
                +{impact.selfConsumptionGainPctPoints}% improvement
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Before (Normal):</span>
                <span>{impact.normalSelfConsumptionPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-slate-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, impact.normalSelfConsumptionPct)}%` }}
                />
              </div>

              <div className="flex justify-between text-emerald-700 font-bold pt-1">
                <span>After (Optimized):</span>
                <span>{impact.optimizedSelfConsumptionPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, impact.optimizedSelfConsumptionPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card B: Grid Energy Import */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Grid Electricity Import</span>
              <span className="text-emerald-700 font-bold font-mono">
                -{impact.gridReductionKWh} kWh avoided
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Before (Normal):</span>
                <span>{impact.normalGridImportKWh} kWh</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-400 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (impact.normalGridImportKWh / Math.max(0.1, impact.normalGridImportKWh + 2)) * 100
                    )}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-emerald-700 font-bold pt-1">
                <span>After (Optimized):</span>
                <span>{impact.optimizedGridImportKWh} kWh</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (impact.optimizedGridImportKWh / Math.max(0.1, impact.normalGridImportKWh + 2)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary metric footnote */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <span>Potential cost impact: <strong className="text-slate-800 font-mono">₹{Math.abs(impact.potentialCostImpactINR).toFixed(2)}/day</strong></span>
          <span>Estimated CO₂ reduction: <strong className="text-emerald-700 font-mono">{impact.co2AvoidedKg} kg CO₂e</strong> (based on assumed grid emission factor)</span>
        </div>
      </div>
    </div>
  );
};
