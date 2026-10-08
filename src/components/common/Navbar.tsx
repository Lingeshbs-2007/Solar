import React from 'react';
import { Sun, RefreshCw, Zap, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface NavbarProps {
  onLoadDemo: () => void;
  onReset: () => void;
  isRecalculating: boolean;
  panelCapacityKW: number;
  locationName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLoadDemo,
  onReset,
  isRecalculating,
  panelCapacityKW,
  locationName,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Sun className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                SolOptimize
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                Green Tech Hackathon
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Predictive Solar Energy Optimization for Grid-Connected Homes
            </p>
          </div>
        </div>

        {/* Current status info & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-200 font-medium">{locationName.split(',')[0]}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-200 font-medium">{panelCapacityKW} kW PV</span>
            </div>
          </div>

          <button
            onClick={onLoadDemo}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
            title="Load the standard Green Tech Hackathon demo household"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Household</span>
          </button>

          <button
            onClick={onReset}
            disabled={isRecalculating}
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 active:scale-95 transition-all cursor-pointer"
            title="Reset to default settings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
