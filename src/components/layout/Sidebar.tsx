import React from 'react';
import {
  Sun,
  LayoutDashboard,
  Zap,
  Activity,
  Bot,
  Sliders,
  Settings,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
  Cpu,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'optimize' | 'monitor' | 'assistant' | 'household' | 'appliances';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLoadDemo: () => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
  locationName: string;
  panelCapacityKW: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onLoadDemo,
  isMobileOpen,
  onMobileToggle,
  locationName,
  panelCapacityKW,
}) => {
  const mainNavItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'optimize' as NavTab, label: 'Optimize', icon: Zap },
    { id: 'monitor' as NavTab, label: 'Solar Monitor', icon: Activity },
    { id: 'assistant' as NavTab, label: 'AI Assistant', icon: Bot },
  ];

  const settingsNavItems = [
    { id: 'household' as NavTab, label: 'Home Setup', icon: Sliders },
    { id: 'appliances' as NavTab, label: 'Appliances', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xs">
              <Sun className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 flex items-center gap-1">
                SolarFlow
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 block">
                Green Tech Engine
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onMobileToggle}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Energy Management
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      if (isMobileOpen) onMobileToggle();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-700/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Configuration & Setup */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Preferences
            </div>
            <nav className="space-y-1">
              {settingsNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      if (isMobileOpen) onMobileToggle();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-700/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Demo Action Card */}
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/60 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Hackathon Prototype</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              Experience the full greedy scheduling engine with standard household presets.
            </p>
            <button
              type="button"
              onClick={onLoadDemo}
              className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs cursor-pointer text-center"
            >
              Load Demo Home
            </button>
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              System Status
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
          <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
            <span className="truncate">{locationName.split(',')[0]}</span>
            <span className="font-mono text-slate-700">{panelCapacityKW} kW PV</span>
          </div>
        </div>
      </aside>
    </>
  );
};
