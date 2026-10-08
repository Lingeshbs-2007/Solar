import React from 'react';
import { SolarForecastResult } from '../../models/forecast';
import { Sun, CloudSun, Calendar, ShieldCheck, AlertTriangle, ArrowUpRight, Clock, Zap } from 'lucide-react';

interface ForecastCardProps {
  forecast: SolarForecastResult;
  isWeatherLoading?: boolean;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast, isWeatherLoading }) => {
  const confidenceColor =
    forecast.forecastConfidence === 'high'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : forecast.forecastConfidence === 'medium'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              Tomorrow&apos;s Solar Forecast
            </h2>
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${confidenceColor}`}>
              {forecast.forecastConfidence} Confidence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>Location: {forecast.locationName}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {forecast.date}
            </span>
          </p>
        </div>

        {forecast.isDeterministicFallback && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Deterministic Solar Engine</span>
          </div>
        )}
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Generation + Confidence Band */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Total Solar Generation
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
              {forecast.totalSolarGenerationKWh}
            </span>
            <span className="text-xs text-slate-400 font-medium">kWh</span>
          </div>

          {/* Confidence interval band */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Confidence Band (80% CI):</span>
            <span className="font-mono text-slate-300 font-medium">
              {forecast.confidenceLowerTotal} - {forecast.confidenceUpperTotal} kWh
            </span>
          </div>
        </div>

        {/* Peak Generation Hour & KW */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Peak Solar Power
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
              {forecast.peakGenerationKW}
            </span>
            <span className="text-xs text-slate-400 font-medium">kW</span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Peak Hour:</span>
            <span className="font-mono text-amber-300 font-medium">
              {forecast.peakGenerationHour}:00 - {forecast.peakGenerationHour + 1}:00
            </span>
          </div>
        </div>

        {/* Useful Solar Window */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Useful Solar Window
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {forecast.usefulSolarWindow.startHour}:00 &ndash; {forecast.usefulSolarWindow.endHour}:00
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Window Average:</span>
            <span className="font-mono text-emerald-300 font-medium">
              {forecast.usefulSolarWindow.averageGenerationKW} kW continuous
            </span>
          </div>
        </div>

        {/* Solar System Sizing */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Array Specific Yield
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-200 font-mono tracking-tight">
              {(forecast.totalSolarGenerationKWh / Math.max(0.1, forecast.panelCapacityKW)).toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-medium">kWh/kWp</span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Installed Array:</span>
            <span className="font-mono text-slate-300 font-medium">
              {forecast.panelCapacityKW} kWp DC
            </span>
          </div>
        </div>
      </div>

      {/* Atmospheric Context & Weather Summary */}
      <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/70 flex items-start gap-3 text-xs text-slate-300">
        <CloudSun className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-slate-200">{forecast.weatherSummary}</p>
          <p className="text-[11px] text-slate-400">
            Night-time generation is strictly 0.0 kWh (sun down). Generation profile incorporates solar zenith calculations, temperature derating coefficients, inverter conversion efficiency, and cloud extinction.
          </p>
        </div>
      </div>
    </div>
  );
};
