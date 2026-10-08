import React, { useState } from 'react';
import { ImpactSummary } from '../../models/impact';
import { SolarForecastResult } from '../../models/forecast';
import { ApplianceScheduleDecision } from '../../models/schedule';
import {
  Sun,
  Zap,
  Clock,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface OptimizeViewProps {
  impact: ImpactSummary;
  forecast: SolarForecastResult;
}

export const OptimizeView: React.FC<OptimizeViewProps> = ({ impact, forecast }) => {
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);

  const toggleWhy = (id: string) => {
    setExpandedWhyId((prev) => (prev === id ? null : id));
  };

  const formatHour12 = (h: number) => {
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
  };

  // SVG dimensions for forecast curve with confidence band
  const svgWidth = 540;
  const svgHeight = 190;
  const pad = { top: 15, right: 15, bottom: 25, left: 35 };
  const graphWidth = svgWidth - pad.left - pad.right;
  const graphHeight = svgHeight - pad.top - pad.bottom;

  const maxVal = Math.max(...forecast.hourly.map((h) => h.confidenceUpper), 1.0);
  const maxY = Math.ceil(maxVal * 1.15);

  const getX = (h: number) => pad.left + (h / 23) * graphWidth;
  const getY = (val: number) => pad.top + graphHeight - (Math.max(0, val) / maxY) * graphHeight;

  // Path for confidence band
  let dUpper = '';
  let dLower = '';
  forecast.hourly.forEach((pt, idx) => {
    const x = getX(pt.hour);
    const yUp = getY(pt.confidenceUpper);
    const yLow = getY(pt.confidenceLower);
    if (idx === 0) {
      dUpper = `M ${x} ${yUp}`;
      dLower = `L ${x} ${yLow}`;
    } else {
      dUpper += ` L ${x} ${yUp}`;
      dLower = ` L ${x} ${yLow}` + dLower;
    }
  });
  const confidenceBandPath = dUpper + dLower + ' Z';

  const solarLinePath = forecast.hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.solarGenerationKWh)}`)
    .join(' ');

  // Timeline hours from 6 AM to 10 PM (hours 6 to 22)
  const timelineStart = 6;
  const timelineEnd = 22;
  const timelineTotalHours = timelineEnd - timelineStart;

  const getTimelineLeftPercent = (hour: number) => {
    const clamped = Math.max(timelineStart, Math.min(timelineEnd, hour));
    return ((clamped - timelineStart) / timelineTotalHours) * 100;
  };

  const solarWindowStartPct = getTimelineLeftPercent(forecast.usefulSolarWindow.startHour);
  const solarWindowEndPct = getTimelineLeftPercent(forecast.usefulSolarWindow.endHour);
  const solarWindowWidthPct = Math.max(0, solarWindowEndPct - solarWindowStartPct);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Optimize Tomorrow
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Find the best times to run flexible appliances using tomorrow&apos;s solar forecast.
        </p>
      </div>

      {/* TOP SECTION: Two Columns (Left Forecast with CI, Right Optimization Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Tomorrow's Solar Forecast Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                Tomorrow&apos;s Solar Forecast
              </h2>
              <span className="text-[11px] text-slate-500">
                Hourly output curve with 80% confidence interval band
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-500 rounded-full" />
                <span className="text-slate-600 font-medium">Expected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 bg-amber-200/70 rounded-xs" />
                <span className="text-slate-500">Confidence Band</span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[440px] select-none">
              {/* Grid Lines */}
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

              {/* Shaded confidence band */}
              <path d={confidenceBandPath} fill="#fde68a" fillOpacity="0.45" />

              {/* Solar generation line */}
              <path
                d={solarLinePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

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

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-mono">
            <span>Peak: {formatHour12(forecast.peakGenerationHour)} ({forecast.peakGenerationKW} kW)</span>
            <span>Total Expected: {forecast.totalSolarGenerationKWh} kWh</span>
          </div>
        </div>

        {/* RIGHT: Optimization Summary (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Optimization Summary
            </h2>
            <span className="text-[11px] text-slate-500">
              Computed by constraint-aware multi-factor greedy scheduler
            </span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-sans">Solar Available:</span>
              <span className="font-bold text-slate-900 text-sm">{forecast.totalSolarGenerationKWh} kWh</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-sans">Flexible Loads:</span>
              <span className="font-bold text-amber-600 text-sm">
                {impact.applianceDecisions.filter((d) => d.changed || d.powerKW > 0).length} appliances
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-sans">Potential Solar Shift:</span>
              <span className="font-bold text-emerald-700 text-sm">
                +{impact.solarDirectUseGainKWh} kWh direct
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-sans">Grid Reduction:</span>
              <span className="font-bold text-emerald-700 text-sm">
                -{impact.gridReductionKWh} kWh
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-600 font-sans">Confidence:</span>
              <span
                className={`font-sans font-bold text-[11px] px-2 py-0.5 rounded-full capitalize ${
                  forecast.forecastConfidence === 'high'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {forecast.forecastConfidence}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 text-[11px] text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Deterministic engine evaluated all continuous feasible slots respecting occupancy.</span>
          </div>
        </div>
      </div>

      {/* MAIN: Recommended Schedule (Timeline-Style Visualization) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Recommended Schedule Timeline
            </h2>
            <p className="text-xs text-slate-500">
              Visualizing appliance shifts into tomorrow&apos;s strongest solar window (6 AM &ndash; 10 PM).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-amber-400/30 border border-amber-500/50 rounded-xs" />
              <span className="text-amber-800 font-semibold text-[11px]">Solar Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
              <span className="text-slate-600 text-[11px]">Recommended Slot</span>
            </div>
          </div>
        </div>

        {/* 6 AM to 10 PM Timeline Rail */}
        <div className="relative pt-6 pb-2">
          {/* Top Axis Bar */}
          <div className="h-2 bg-slate-100 rounded-full relative overflow-visible">
            {/* Highlighted Solar Window Area */}
            <div
              className="absolute top-0 bottom-0 bg-amber-400/30 border-x-2 border-amber-500 rounded-xs"
              style={{
                left: `${solarWindowStartPct}%`,
                width: `${solarWindowWidthPct}%`,
              }}
            >
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                <Sun className="w-3 h-3 fill-amber-500 text-amber-500" />
                Solar Window ({formatHour12(forecast.usefulSolarWindow.startHour)} -{' '}
                {formatHour12(forecast.usefulSolarWindow.endHour)})
              </span>
            </div>
          </div>

          {/* Time Labels */}
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
            <span>6 AM</span>
            <span>9 AM</span>
            <span>12 PM</span>
            <span>3 PM</span>
            <span>6 PM</span>
            <span>10 PM</span>
          </div>

          {/* Branched Appliance Nodes */}
          <div className="mt-6 space-y-4">
            {impact.applianceDecisions.map((decision) => {
              const optLeftPct = getTimelineLeftPercent(decision.optimizedStartHour);
              const isExpanded = expandedWhyId === decision.applianceId;

              return (
                <div
                  key={decision.applianceId}
                  className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-bold shadow-2xs">
                        {decision.applianceName.toLowerCase().includes('wash')
                          ? '🧺'
                          : decision.applianceName.toLowerCase().includes('dish')
                          ? '🍽'
                          : decision.applianceName.toLowerCase().includes('water')
                          ? '🚿'
                          : '⚡'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {decision.applianceName}
                          </span>
                          {decision.changed ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full uppercase tracking-wider">
                              Shifted
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.2 rounded-full">
                              No change
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {decision.powerKW} kW &bull; {decision.durationHours} hr runtime
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs sm:justify-end">
                      <div className="font-mono text-xs flex items-center gap-1.5">
                        <span className="text-slate-400 line-through">
                          {formatHour12(decision.normalStartHour)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-emerald-700 text-sm bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                          {formatHour12(decision.optimizedStartHour)}
                        </span>
                      </div>

                      {decision.solarBenefitKWh > 0 && (
                        <span className="text-emerald-700 font-mono font-semibold text-xs">
                          +{decision.solarBenefitKWh} kWh
                        </span>
                      )}

                      {/* Small "Why?" button */}
                      <button
                        type="button"
                        onClick={() => toggleWhy(decision.applianceId)}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Why?</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Visual Node Pin on Mini Rail */}
                  <div className="mt-3 relative h-1.5 bg-slate-200 rounded-full">
                    {/* Solar window backing */}
                    <div
                      className="absolute top-0 bottom-0 bg-amber-300/40"
                      style={{
                        left: `${solarWindowStartPct}%`,
                        width: `${solarWindowWidthPct}%`,
                      }}
                    />
                    {/* Pin marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs"
                      style={{ left: `${optLeftPct}%` }}
                      title={`Scheduled at ${formatHour12(decision.optimizedStartHour)}`}
                    />
                  </div>

                  {/* Expandable "Why?" Human Explanation */}
                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 text-xs text-slate-700 bg-white p-3 rounded-lg border space-y-1.5 animate-in fade-in">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Optimizer Decision Rationale:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {decision.reason}
                      </p>
                      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 font-mono pt-1">
                        <span>Allowed Window: {formatHour12(decision.allowedWindow.start)} - {formatHour12(decision.allowedWindow.end)}</span>
                        <span>Solar Captured: +{decision.solarBenefitKWh} kWh</span>
                        <span>Grid Import Avoided: {decision.gridReductionKWh} kWh</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
