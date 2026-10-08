import React, { useState } from 'react';
import { HourlyEnergyPoint } from '../../models/schedule';
import { Layers, ArrowDownToLine, ArrowUpFromLine, Sun, Zap } from 'lucide-react';

interface HourlyBalanceTableProps {
  hourly: HourlyEnergyPoint[];
}

export const HourlyBalanceTable: React.FC<HourlyBalanceTableProps> = ({ hourly }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'surplus' | 'shortage'>('all');

  const filtered = hourly.filter((h) => {
    if (filterMode === 'surplus') return h.classification === 'SURPLUS';
    if (filterMode === 'shortage') return h.classification === 'SHORTAGE';
    return true;
  });

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Hour-by-Hour Energy & Solar Balance (Optimized)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full 24-hour breakdown of solar generation, active appliance demand, direct use, grid import, and export surplus.
          </p>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(
            [
              ['all', 'All 24h'],
              ['surplus', 'Surplus Hours'],
              ['shortage', 'Grid Import Hours'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setFilterMode(m)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filterMode === m
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Hour</th>
              <th className="py-2.5 px-3">Solar (kWh)</th>
              <th className="py-2.5 px-3">Demand (kWh)</th>
              <th className="py-2.5 px-3">Direct Solar</th>
              <th className="py-2.5 px-3">Grid Import</th>
              <th className="py-2.5 px-3">Surplus Solar</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Active Appliances</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {filtered.map((pt) => {
              const statusColor =
                pt.classification === 'SURPLUS'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                  : pt.classification === 'SHORTAGE'
                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/30';

              return (
                <tr key={pt.hour} className="hover:bg-slate-950/60 transition-colors">
                  <td className="py-2 px-3 text-slate-400">
                    {pt.hour < 10 ? `0${pt.hour}` : pt.hour}:00
                  </td>
                  <td className="py-2 px-3 text-amber-400 font-bold">
                    {pt.solarGenerationKWh > 0 ? pt.solarGenerationKWh.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-2 px-3 text-slate-100 font-bold">
                    {pt.totalDemandKWh.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-emerald-400">
                    {pt.directSolarUseKWh.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-rose-400">
                    {pt.gridImportKWh > 0 ? pt.gridImportKWh.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-2 px-3 text-amber-300">
                    {pt.surplusSolarKWh > 0 ? pt.surplusSolarKWh.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {pt.classification}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans text-[11px] text-slate-400">
                    {pt.activeAppliances.map((a) => a.name).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
