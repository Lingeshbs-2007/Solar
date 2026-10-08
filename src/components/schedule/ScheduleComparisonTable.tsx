import React from 'react';
import { ApplianceScheduleDecision } from '../../models/schedule';
import { Clock, ArrowRight, Sun, Zap, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ScheduleComparisonTableProps {
  decisions: ApplianceScheduleDecision[];
}

export const ScheduleComparisonTable: React.FC<ScheduleComparisonTableProps> = ({ decisions }) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Appliance Decision Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent algorithmic reasoning for every fixed and flexible household appliance.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-amber-400 font-bold">
            {decisions.filter((d) => d.changed).length}
          </span>{' '}
          of {decisions.length} rescheduled
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Appliance</th>
              <th className="py-2.5 px-3">Load & Run</th>
              <th className="py-2.5 px-3">Normal</th>
              <th className="py-2.5 px-3">Optimized</th>
              <th className="py-2.5 px-3">Shift</th>
              <th className="py-2.5 px-3">Solar Captured</th>
              <th className="py-2.5 px-3">Grid Avoided</th>
              <th className="py-2.5 px-3">Optimizer Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {decisions.map((d) => (
              <tr
                key={d.applianceId}
                className={`hover:bg-slate-950/60 transition-colors ${
                  d.changed ? 'bg-emerald-500/5' : ''
                }`}
              >
                {/* Name */}
                <td className="py-3 px-3 font-sans font-medium text-slate-200">
                  <div className="flex items-center gap-1.5">
                    {d.changed ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                    <span>{d.applianceName}</span>
                  </div>
                </td>

                {/* Load */}
                <td className="py-3 px-3 text-slate-400">
                  <span className="text-amber-400 font-bold">{d.powerKW}</span> kW &times;{' '}
                  <span>{d.durationHours}</span>h
                </td>

                {/* Normal */}
                <td className="py-3 px-3 text-slate-300">
                  {d.normalStartHour < 10 ? `0${d.normalStartHour}` : d.normalStartHour}:00
                </td>

                {/* Optimized */}
                <td className="py-3 px-3 font-bold">
                  {d.changed ? (
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {d.optimizedStartHour < 10 ? `0${d.optimizedStartHour}` : d.optimizedStartHour}:00
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {d.optimizedStartHour < 10 ? `0${d.optimizedStartHour}` : d.optimizedStartHour}:00
                    </span>
                  )}
                </td>

                {/* Shift */}
                <td className="py-3 px-3">
                  {d.changed ? (
                    <span className="text-emerald-300 font-bold">
                      {d.shiftHours > 0 ? `+${d.shiftHours}h` : `${d.shiftHours}h`}
                    </span>
                  ) : (
                    <span className="text-slate-500">0h</span>
                  )}
                </td>

                {/* Solar benefit */}
                <td className="py-3 px-3 text-emerald-400">
                  {d.solarBenefitKWh > 0 ? `+${d.solarBenefitKWh} kWh` : '&mdash;'}
                </td>

                {/* Grid reduction */}
                <td className="py-3 px-3 text-emerald-400">
                  {d.gridReductionKWh > 0 ? `-${d.gridReductionKWh} kWh` : '&mdash;'}
                </td>

                {/* Rationale */}
                <td className="py-3 px-3 font-sans text-[11px] text-slate-400 max-w-xs">
                  {d.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
