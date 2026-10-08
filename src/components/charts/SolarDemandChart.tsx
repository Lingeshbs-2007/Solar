import React, { useState } from 'react';
import { HourlyEnergyPoint } from '../../models/schedule';
import { SolarForecastResult } from '../../models/forecast';
import { Sun, Zap, ArrowDownToLine, ArrowUpFromLine, Layers } from 'lucide-react';

interface SolarDemandChartProps {
  normalHourly: HourlyEnergyPoint[];
  optimizedHourly: HourlyEnergyPoint[];
  forecast: SolarForecastResult;
}

export const SolarDemandChart: React.FC<SolarDemandChartProps> = ({
  normalHourly,
  optimizedHourly,
  forecast,
}) => {
  const [viewMode, setViewMode] = useState<'optimized' | 'normal' | 'compare'>('optimized');
  const [hoveredHour, setHoveredHour] = useState<number | null>(13); // default highlight midday

  // SVG chart dimensions
  const svgWidth = 840;
  const svgHeight = 280;
  const padding = { top: 25, right: 30, bottom: 40, left: 55 };

  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Maximum value for scaling Y-axis
  const maxSolar = Math.max(...forecast.hourly.map((h) => h.confidenceUpper), 1.0);
  const maxDemandNormal = Math.max(...normalHourly.map((h) => h.totalDemandKWh), 1.0);
  const maxDemandOpt = Math.max(...optimizedHourly.map((h) => h.totalDemandKWh), 1.0);
  const maxY = Math.ceil(Math.max(maxSolar, maxDemandNormal, maxDemandOpt, 3.5) * 1.15);

  const getX = (h: number) => padding.left + (h / 23) * graphWidth;
  const getY = (val: number) => padding.top + graphHeight - (Math.max(0, val) / maxY) * graphHeight;

  // Active dataset according to view mode
  const currentDataset = viewMode === 'normal' ? normalHourly : optimizedHourly;
  const activePt = hoveredHour !== null ? currentDataset[hoveredHour] : null;
  const forecastPt = hoveredHour !== null ? forecast.hourly[hoveredHour] : null;

  // Solar confidence band path (area between lower and upper)
  const solarBandPath = (() => {
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
    return dUpper + dLower + ' Z';
  })();

  // Solar generation line path
  const solarLinePath = forecast.hourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.solarGenerationKWh)}`)
    .join(' ');

  // Demand line path for normal
  const normalDemandPath = normalHourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.totalDemandKWh)}`)
    .join(' ');

  // Demand line path for optimized
  const optDemandPath = optimizedHourly
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(pt.hour)} ${getY(pt.totalDemandKWh)}`)
    .join(' ');

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            24-Hour Solar vs. Household Demand Profile
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hourly energy balance comparing solar irradiance generation against scheduled appliance demand.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('optimized')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              viewMode === 'optimized'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Optimized Schedule
          </button>
          <button
            type="button"
            onClick={() => setViewMode('normal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              viewMode === 'normal'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Normal Schedule
          </button>
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              viewMode === 'compare'
                ? 'bg-blue-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overlay Compare
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-amber-400 rounded-full" />
          <span className="font-medium text-slate-200">Solar Generation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 bg-amber-500/20 border border-amber-500/40 rounded-sm" />
          <span>Forecast Confidence Band</span>
        </div>
        {viewMode !== 'normal' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-400 rounded-full" />
            <span className="text-emerald-300 font-medium">Optimized Demand</span>
          </div>
        )}
        {viewMode !== 'optimized' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-slate-400 border-b border-dashed border-slate-300 rounded-full" />
            <span className="text-slate-300">Normal Demand</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 inline-block" />
          <span>Direct Solar Self-Consumption</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/40 inline-block" />
          <span>Grid Import</span>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[680px] select-none"
        >
          {/* Grid lines and Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((fraction) => {
            const val = fraction * maxY;
            const y = getY(val);
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {val.toFixed(1)} kW
                </text>
              </g>
            );
          })}

          {/* Useful solar window highlight rectangle */}
          {forecast.usefulSolarWindow.startHour < forecast.usefulSolarWindow.endHour && (
            <rect
              x={getX(forecast.usefulSolarWindow.startHour)}
              y={padding.top}
              width={
                getX(forecast.usefulSolarWindow.endHour) - getX(forecast.usefulSolarWindow.startHour)
              }
              height={graphHeight}
              fill="#fbbf24"
              fillOpacity="0.04"
              stroke="#f59e0b"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          )}

          {/* Shaded Energy Balance Bars under curves */}
          {currentDataset.map((pt) => {
            const barWidth = (graphWidth / 24) * 0.75;
            const x = getX(pt.hour) - barWidth / 2;

            const directSolarHeight = (pt.directSolarUseKWh / maxY) * graphHeight;
            const gridImportHeight = (pt.gridImportKWh / maxY) * graphHeight;

            const yBase = padding.top + graphHeight;
            const yDirect = yBase - directSolarHeight;
            const yGrid = yDirect - gridImportHeight;

            const isHovered = hoveredHour === pt.hour;

            return (
              <g
                key={pt.hour}
                onMouseEnter={() => setHoveredHour(pt.hour)}
                className="cursor-pointer"
              >
                {/* Background hover column */}
                <rect
                  x={getX(pt.hour) - graphWidth / 48}
                  y={padding.top}
                  width={graphWidth / 24}
                  height={graphHeight}
                  fill={isHovered ? '#38bdf8' : 'transparent'}
                  fillOpacity="0.08"
                />

                {/* Direct Solar Consumption stack (green) */}
                {directSolarHeight > 0 && (
                  <rect
                    x={x}
                    y={yDirect}
                    width={barWidth}
                    height={directSolarHeight}
                    fill="#10b981"
                    fillOpacity={isHovered ? 0.75 : 0.5}
                    rx="1.5"
                  />
                )}

                {/* Grid Import stack (rose/amber) */}
                {gridImportHeight > 0 && (
                  <rect
                    x={x}
                    y={yGrid}
                    width={barWidth}
                    height={gridImportHeight}
                    fill="#f43f5e"
                    fillOpacity={isHovered ? 0.7 : 0.45}
                    rx="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* Solar Confidence Band (Area) */}
          <path d={solarBandPath} fill="#fbbf24" fillOpacity="0.12" />

          {/* Solar Generation Curve Line */}
          <path
            d={solarLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Normal Demand Line (when in normal or compare mode) */}
          {(viewMode === 'normal' || viewMode === 'compare') && (
            <path
              d={normalDemandPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray={viewMode === 'compare' ? '4 3' : 'none'}
              strokeLinecap="round"
            />
          )}

          {/* Optimized Demand Line (when in optimized or compare mode) */}
          {(viewMode === 'optimized' || viewMode === 'compare') && (
            <path
              d={optDemandPath}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-axis tick labels (Hours 0 to 23) */}
          {Array.from({ length: 24 }).map((_, h) => {
            const x = getX(h);
            const isHighlight = h % 3 === 0 || h === hoveredHour;
            return (
              <g key={h}>
                <line
                  x1={x}
                  y1={padding.top + graphHeight}
                  x2={x}
                  y2={padding.top + graphHeight + 4}
                  stroke={h === hoveredHour ? '#fbbf24' : '#475569'}
                  strokeWidth={h === hoveredHour ? 2 : 1}
                />
                {isHighlight && (
                  <text
                    x={x}
                    y={padding.top + graphHeight + 17}
                    textAnchor="middle"
                    fontSize="10"
                    fill={h === hoveredHour ? '#fbbf24' : '#64748b'}
                    fontFamily="monospace"
                    fontWeight={h === hoveredHour ? 'bold' : 'normal'}
                  >
                    {h < 10 ? `0${h}` : h}:00
                  </text>
                )}
              </g>
            );
          })}

          {/* Hover indicator vertical line */}
          {hoveredHour !== null && (
            <line
              x1={getX(hoveredHour)}
              y1={padding.top}
              x2={getX(hoveredHour)}
              y2={padding.top + graphHeight}
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>

      {/* Hourly Detail Inspector Bar (Active on Hover) */}
      {activePt && forecastPt && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in">
          <div>
            <span className="text-slate-500 block text-[11px]">Selected Hour</span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              {hoveredHour}:00 - {Number(hoveredHour) + 1}:00
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" /> Solar Generation
            </span>
            <span className="font-bold text-amber-300 font-mono text-sm">
              {forecastPt.solarGenerationKWh} kWh
            </span>
            <span className="text-[10px] text-slate-500 block">
              CI: {forecastPt.confidenceLower} - {forecastPt.confidenceUpper}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" /> Total Demand
            </span>
            <span className="font-bold text-slate-100 font-mono text-sm">
              {activePt.totalDemandKWh} kWh
            </span>
            <span className="text-[10px] text-slate-500 block">
              Fixed: {activePt.fixedDemandKWh} | Flex: {activePt.flexibleDemandKWh}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] flex items-center gap-1">
              <ArrowDownToLine className="w-3 h-3 text-emerald-400" /> Direct Solar Used
            </span>
            <span className="font-bold text-emerald-400 font-mono text-sm">
              {activePt.directSolarUseKWh} kWh
            </span>
            <span className="text-[10px] text-emerald-500/80 block">Self-consumed clean</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] flex items-center gap-1">
              <ArrowUpFromLine className="w-3 h-3 text-rose-400" /> Grid Import
            </span>
            <span className="font-bold text-rose-400 font-mono text-sm">
              {activePt.gridImportKWh} kWh
            </span>
            <span className="text-[10px] text-rose-500/80 block">Imported from grid</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Net Surplus Export</span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              {activePt.surplusSolarKWh} kWh
            </span>
            <span className="text-[10px] text-amber-500/80 block">Available / Feed-in</span>
          </div>
        </div>
      )}
    </div>
  );
};
