import React from 'react';
import { ImpactSummary } from '../../models/impact';
import { Sun, ArrowDownRight, IndianRupee, Leaf, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

interface ImpactSummaryCardsProps {
  impact: ImpactSummary;
}

export const ImpactSummaryCards: React.FC<ImpactSummaryCardsProps> = ({ impact }) => {
  return (
    <div className="space-y-4">
      {/* Notice Banner adhering strictly to prompt instructions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Simulated Comparison:</strong> Potential impact calculated dynamically from your appliance power ratings, runtimes, and local solar forecast. Results do not constitute guaranteed utility savings.
          </span>
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Solar Self-Consumption % (Primary) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              Solar Self-Consumption
            </span>
            {impact.selfConsumptionGainPctPoints > 0 && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{impact.selfConsumptionGainPctPoints}% pts
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono tracking-tight">
              {impact.optimizedSelfConsumptionPct}%
            </span>
            <span className="text-xs text-slate-400">optimized</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normal schedule:</span>
            <span className="font-mono text-slate-300 font-medium">
              {impact.normalSelfConsumptionPct}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
            <span>Clean Solar Captured:</span>
            <span className="font-mono text-emerald-400">
              {impact.optimizedSolarUsedDirectlyKWh} / {impact.totalSolarGenerationKWh} kWh
            </span>
          </div>
        </div>

        {/* Metric 2: Grid Energy Reduced (kWh) (Primary) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              Grid Energy Reduced
            </span>
            {impact.gridReductionPct > 0 && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                -{impact.gridReductionPct}% grid
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {impact.gridReductionKWh}
            </span>
            <span className="text-xs text-slate-400 font-medium">kWh / day</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normal Grid Import:</span>
            <span className="font-mono text-rose-300 font-medium">
              {impact.normalGridImportKWh} kWh
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
            <span>Optimized Grid Import:</span>
            <span className="font-mono text-emerald-300 font-medium">
              {impact.optimizedGridImportKWh} kWh
            </span>
          </div>
        </div>

        {/* Metric 3: Potential Cost Impact (₹) (Secondary) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-amber-400" />
              Potential Cost Impact
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              Simulated
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-amber-400 font-bold">₹</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-100 font-mono tracking-tight">
              {Math.abs(impact.potentialCostImpactINR).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">/ day</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Normal Tariff Cost:</span>
            <span className="font-mono text-slate-300">
              ₹{impact.normalCostINR.toFixed(2)}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
            <span>Optimized Cost:</span>
            <span className="font-mono text-emerald-400">
              ₹{impact.optimizedCostINR.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metric 4: Ecological Footprint */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-400" />
              CO₂ Emissions Avoided
            </span>
            <span className="text-[10px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Green Impact
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {impact.co2AvoidedKg}
            </span>
            <span className="text-xs text-slate-400 font-medium">kg CO₂e</span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Shifted Appliances:</span>
            <span className="font-mono text-amber-400 font-medium">
              {impact.shiftedAppliancesCount} of {impact.totalAppliancesCount} shifted
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
            <span>Surplus Solar Remaining:</span>
            <span className="font-mono text-slate-300">
              {impact.optimizedSurplusKWh} kWh
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
