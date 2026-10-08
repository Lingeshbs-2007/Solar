import React from 'react';
import { ApplianceScheduleDecision } from '../../models/schedule';
import { UsefulSolarWindow } from '../../models/forecast';
import { Clock, ArrowRight, Sun, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ScheduleGanttChartProps {
  decisions: ApplianceScheduleDecision[];
  solarWindow: UsefulSolarWindow;
}

export const ScheduleGanttChart: React.FC<ScheduleGanttChartProps> = ({
  decisions,
  solarWindow,
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Visual Appliance Schedule Timeline (24 Hours)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare normal preferred schedules against greedy constraint-aware optimized start times.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-slate-700 rounded-sm" />
            <span className="text-slate-400">Normal Routine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-emerald-500 rounded-sm" />
            <span className="text-emerald-300 font-medium">Optimized Solar Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-amber-500/20 border border-amber-500/40 rounded-sm" />
            <span className="text-amber-300 font-medium">Solar Window</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Header Labels */}
      <div className="relative pt-2">
        <div className="grid grid-cols-24 gap-0 text-[10px] text-slate-500 font-mono border-b border-slate-800 pb-1.5 pl-36 sm:pl-48">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? (h < 10 ? `0${h}` : h) : '&middot;'}
            </div>
          ))}
        </div>

        {/* Appliance Rows */}
        <div className="space-y-3 pt-3">
          {decisions.map((decision) => {
            const normalStart = decision.normalStartHour;
            const optStart = decision.optimizedStartHour;
            const duration = decision.durationHours;

            // Width percentage for 1 hour = 100 / 24
            const normalLeftPct = (normalStart / 24) * 100;
            const normalWidthPct = (duration / 24) * 100;

            const optLeftPct = (optStart / 24) * 100;
            const optWidthPct = (duration / 24) * 100;

            const solarWinLeft = (solarWindow.startHour / 24) * 100;
            const solarWinWidth =
              ((solarWindow.endHour - solarWindow.startHour) / 24) * 100;

            return (
              <div
                key={decision.applianceId}
                className="flex items-center text-xs py-1.5 border-b border-slate-800/40 last:border-b-0 hover:bg-slate-950/40 rounded-lg px-1 transition-colors"
              >
                {/* Appliance Label */}
                <div className="w-36 sm:w-48 shrink-0 pr-2">
                  <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                    {decision.applianceName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <span>{decision.powerKW}kW &times; {decision.durationHours}h</span>
                    {decision.changed ? (
                      <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-500/10 px-1 rounded border border-emerald-500/30">
                        {decision.shiftHours > 0 ? `+${decision.shiftHours}h` : `${decision.shiftHours}h`}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Unchanged</span>
                    )}
                  </div>
                </div>

                {/* 24h Timeline Track */}
                <div className="relative flex-1 h-12 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden">
                  {/* Solar Window Highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-amber-500/10 border-x border-amber-500/30 pointer-events-none"
                    style={{ left: `${solarWinLeft}%`, width: `${solarWinWidth}%` }}
                    title={`Solar peak window: ${solarWindow.startHour}:00 - ${solarWindow.endHour}:00`}
                  />

                  {/* Normal Schedule Bar (Top track) */}
                  <div
                    className={`absolute top-1.5 h-4 rounded text-[10px] font-mono flex items-center justify-center transition-all ${
                      decision.changed
                        ? 'bg-slate-700/80 text-slate-300 border border-slate-600/60 line-through opacity-75'
                        : 'bg-slate-700 text-slate-200 border border-slate-600'
                    }`}
                    style={{
                      left: `${normalLeftPct}%`,
                      width: `${Math.max(normalWidthPct, 3.5)}%`,
                    }}
                    title={`Normal schedule: ${normalStart}:00`}
                  >
                    <span className="truncate px-1 hidden sm:inline">
                      {normalStart}:00
                    </span>
                  </div>

                  {/* Optimized Schedule Bar (Bottom track) */}
                  <div
                    className={`absolute bottom-1.5 h-4 rounded text-[10px] font-mono flex items-center justify-center font-semibold transition-all ${
                      decision.changed
                        ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                    style={{
                      left: `${optLeftPct}%`,
                      width: `${Math.max(optWidthPct, 3.5)}%`,
                    }}
                    title={`Optimized schedule: ${optStart}:00`}
                  >
                    <span className="truncate px-1">
                      {optStart}:00
                    </span>
                  </div>

                  {/* Shift Connector Arrow (when changed) */}
                  {decision.changed && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400 font-bold flex items-center"
                      style={{
                        left: `${Math.min(normalLeftPct, optLeftPct) + 2}%`,
                      }}
                    >
                      <span className="text-[10px] px-1 bg-slate-900/90 rounded text-emerald-300 border border-emerald-500/40">
                        {normalStart}:00 &rarr; {optStart}:00
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
