import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HouseholdConfig,
  DEFAULT_HOUSEHOLD_CONFIG,
  getDefaultOccupancyHours,
} from './models/household';
import { Appliance, DEMO_APPLIANCES } from './models/appliance';
import { SolarForecastResult } from './models/forecast';
import { ImpactSummary } from './models/impact';
import { getSolarForecastForHousehold } from './services/weather';
import { calculateImpactSummary } from './engines/impactCalculator';

import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { OptimizeView } from './components/optimization/OptimizeView';
import { SolarMonitorView } from './components/monitoring/SolarMonitorView';
import { SolarAIView } from './components/assistant/SolarAIView';
import { HomeSetupView } from './components/setup/HomeSetupView';
import { AppliancesView } from './components/appliances/AppliancesView';

import { Menu, Sun, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  // Household configuration state
  const [household, setHousehold] = useState<HouseholdConfig>(DEFAULT_HOUSEHOLD_CONFIG);

  // Appliances state
  const [appliances, setAppliances] = useState<Appliance[]>(DEMO_APPLIANCES);

  // Navigation state (Dashboard is default)
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Solar forecast state
  const [forecast, setForecast] = useState<SolarForecastResult | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState<boolean>(true);

  // Dynamically calculate next-day solar forecast whenever location or panel capacity changes
  useEffect(() => {
    let isCancelled = false;
    setIsForecastLoading(true);

    getSolarForecastForHousehold(household.location, household.panelCapacityKW)
      .then((res) => {
        if (!isCancelled) {
          setForecast(res);
          setIsForecastLoading(false);
        }
      })
      .catch((err) => {
        console.error('Forecast calculation error:', err);
        if (!isCancelled) {
          setIsForecastLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [household.location, household.panelCapacityKW]);

  // Dynamically compute live optimization and normal vs optimized impact summary
  const impactSummary: ImpactSummary | null = useMemo(() => {
    if (!forecast) return null;
    return calculateImpactSummary(appliances, forecast, household);
  }, [appliances, forecast, household]);

  // Handler: Load Standard Demo Household (preserves real calculation pipeline)
  const handleLoadDemoHousehold = useCallback(() => {
    setHousehold({
      ...DEFAULT_HOUSEHOLD_CONFIG,
      panelCapacityKW: 3.0,
      occupantsCount: 4,
      occupancyPattern: 'office_hours',
      occupancyHours: getDefaultOccupancyHours('office_hours'),
      electricityTariff: 7.5,
      exportRate: 3.0,
      peakPricingEnabled: true,
      peakTariff: 10.5,
      peakStartHour: 18,
      peakEndHour: 22,
      solarExportEnabled: true,
    });
    setAppliances(DEMO_APPLIANCES);
    setActiveTab('dashboard');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex antialiased">
      {/* Left Application Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLoadDemo={handleLoadDemoHousehold}
        isMobileOpen={isMobileSidebarOpen}
        onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        locationName={household.location.name}
        panelCapacityKW={household.panelCapacityKW}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Mobile Top App Bar */}
        <header className="lg:hidden h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
              SolarFlow
            </span>
          </div>

          <button
            type="button"
            onClick={handleLoadDemoHousehold}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-white"
          >
            Demo
          </button>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Fallback loading indicator if forecast is recalculating */}
          {isForecastLoading && !forecast ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">
                Calculating tomorrow&apos;s solar generation & demand model...
              </p>
            </div>
          ) : impactSummary && forecast ? (
            <>
              {/* Active Tab Router */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  impact={impactSummary}
                  forecast={forecast}
                  onGoToOptimize={() => setActiveTab('optimize')}
                />
              )}

              {activeTab === 'optimize' && (
                <OptimizeView impact={impactSummary} forecast={forecast} />
              )}

              {activeTab === 'monitor' && <SolarMonitorView forecast={forecast} />}

              {activeTab === 'assistant' && (
                <SolarAIView impact={impactSummary} household={household} />
              )}

              {activeTab === 'household' && (
                <HomeSetupView config={household} onChange={setHousehold} />
              )}

              {activeTab === 'appliances' && (
                <AppliancesView
                  appliances={appliances}
                  onChange={setAppliances}
                  onLoadDemo={handleLoadDemoHousehold}
                />
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
