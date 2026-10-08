import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { AIExplanationResult, getAIOptimizationExplanation } from './services/aiRecommendation';

import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { OptimizeView } from './components/optimization/OptimizeView';
import { SolarMonitorView } from './components/monitoring/SolarMonitorView';
import { SolarAIView } from './components/assistant/SolarAIView';
import { HomeSetupView } from './components/setup/HomeSetupView';
import { AppliancesView } from './components/appliances/AppliancesView';

import { Menu, Sun, Sparkles, RefreshCw } from 'lucide-react';

const STORAGE_KEY_HOUSEHOLD = 'solarflow_household_v1';
const STORAGE_KEY_APPLIANCES = 'solarflow_appliances_v1';
const STORAGE_KEY_PLAN = 'solarflow_plan_v1';

export default function App() {
  // Single Source of Truth for Household & Appliances with localStorage restoration
  const [household, setHouseholdState] = useState<HouseholdConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HOUSEHOLD);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed restoring household from storage:', e);
    }
    return DEFAULT_HOUSEHOLD_CONFIG;
  });

  const [appliances, setAppliancesState] = useState<Appliance[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPLIANCES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed restoring appliances from storage:', e);
    }
    return DEMO_APPLIANCES;
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Solar forecast & Optimization impact state
  const [forecast, setForecast] = useState<SolarForecastResult | null>(null);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);

  // Generation status and stale flag
  const [isPlanStale, setIsPlanStale] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string | null>(null);

  // AI Explanation
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Track initial mount
  const isFirstMount = useRef(true);

  // Update household wrapper that flags plan as stale and persists
  const handleUpdateHousehold = useCallback((updated: HouseholdConfig) => {
    setHouseholdState(updated);
    setIsPlanStale(true);
    try {
      localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, []);

  // Update appliances wrapper that flags plan as stale and persists
  const handleUpdateAppliances = useCallback((updated: Appliance[]) => {
    setAppliancesState(updated);
    setIsPlanStale(true);
    try {
      localStorage.setItem(STORAGE_KEY_APPLIANCES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }, []);

  // Staged Execution Pipeline: Generate Tomorrow's Plan
  const handleGeneratePlan = useCallback(
    async (customHousehold?: HouseholdConfig, customAppliances?: Appliance[]) => {
      const targetHousehold = customHousehold || household;
      const targetAppliances = customAppliances || appliances;

      setIsGeneratingPlan(true);

      try {
        // Stage 1: Fetching forecast
        setGenerationStage('Stage 1/5: Querying weather & solar forecast...');
        await new Promise((r) => setTimeout(r, 220));
        const newForecast = await getSolarForecastForHousehold(
          targetHousehold.location,
          targetHousehold.panelCapacityKW
        );
        setForecast(newForecast);

        // Stage 2: Estimating demand
        setGenerationStage('Stage 2/5: Estimating 24-hour demand profile...');
        await new Promise((r) => setTimeout(r, 180));

        // Stage 3: Finding solar mismatch & greedy optimization
        setGenerationStage('Stage 3/5: Running constraint-aware optimizer...');
        await new Promise((r) => setTimeout(r, 200));

        // Stage 4: Calculating impact
        setGenerationStage('Stage 4/5: Calculating schedule impact & self-consumption...');
        await new Promise((r) => setTimeout(r, 160));
        const newImpact = calculateImpactSummary(targetAppliances, newForecast, targetHousehold);
        setImpactSummary(newImpact);

        // Stage 5: Plan ready
        setGenerationStage('Stage 5/5: Plan ready!');
        await new Promise((r) => setTimeout(r, 150));

        setIsPlanStale(false);

        // Persist generated plan
        try {
          localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify({
            forecast: newForecast,
            impact: newImpact,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.warn('Storage plan save failed:', e);
        }

        // Asynchronously request AI explanation
        setIsAiLoading(true);
        getAIOptimizationExplanation(newImpact)
          .then((res) => setAiExplanation(res))
          .catch((err) => console.warn('AI explanation failed:', err))
          .finally(() => setIsAiLoading(false));
      } catch (err) {
        console.error('Plan generation failed:', err);
      } finally {
        setIsGeneratingPlan(false);
        setGenerationStage(null);
      }
    },
    [household, appliances]
  );

  // On mount: restore previous valid plan or generate plan
  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;

    try {
      const savedPlanStr = localStorage.getItem(STORAGE_KEY_PLAN);
      if (savedPlanStr) {
        const parsed = JSON.parse(savedPlanStr);
        if (parsed.forecast && parsed.impact) {
          setForecast(parsed.forecast);
          setImpactSummary(parsed.impact);
          setIsPlanStale(false);

          // Get initial AI explanation
          setIsAiLoading(true);
          getAIOptimizationExplanation(parsed.impact)
            .then((res) => setAiExplanation(res))
            .catch(() => {})
            .finally(() => setIsAiLoading(false));
          return;
        }
      }
    } catch (e) {
      console.warn('Could not restore saved plan:', e);
    }

    // Generate initial plan if none saved
    handleGeneratePlan();
  }, [handleGeneratePlan]);

  // Handler: Load Standard Demo Household
  const handleLoadDemoHousehold = useCallback(() => {
    const demoH: HouseholdConfig = {
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
    };

    setHouseholdState(demoH);
    setAppliancesState(DEMO_APPLIANCES);

    try {
      localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(demoH));
      localStorage.setItem(STORAGE_KEY_APPLIANCES, JSON.stringify(DEMO_APPLIANCES));
    } catch (e) {
      console.warn(e);
    }

    handleGeneratePlan(demoH, DEMO_APPLIANCES);
    setActiveTab('dashboard');
  }, [handleGeneratePlan]);

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
          {/* Initial Loading skeleton if forecast hasn't arrived yet */}
          {!forecast || !impactSummary ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                {generationStage || 'Initializing SolarFlow Optimization Engine...'}
              </p>
            </div>
          ) : (
            <>
              {/* Active Tab Router */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  impact={impactSummary}
                  forecast={forecast}
                  isPlanStale={isPlanStale}
                  isGeneratingPlan={isGeneratingPlan}
                  generationStage={generationStage}
                  onGeneratePlan={() => handleGeneratePlan()}
                  onGoToOptimize={() => setActiveTab('optimize')}
                />
              )}

              {activeTab === 'optimize' && (
                <OptimizeView
                  impact={impactSummary}
                  forecast={forecast}
                  aiExplanation={aiExplanation}
                  isAiLoading={isAiLoading}
                  onRefreshAI={() => {
                    if (impactSummary) {
                      setIsAiLoading(true);
                      getAIOptimizationExplanation(impactSummary)
                        .then((res) => setAiExplanation(res))
                        .catch(() => {})
                        .finally(() => setIsAiLoading(false));
                    }
                  }}
                  isPlanStale={isPlanStale}
                  onGeneratePlan={() => handleGeneratePlan()}
                  isGeneratingPlan={isGeneratingPlan}
                />
              )}

              {activeTab === 'monitor' && <SolarMonitorView forecast={forecast} />}

              {activeTab === 'assistant' && (
                <SolarAIView impact={impactSummary} household={household} />
              )}

              {activeTab === 'household' && (
                <HomeSetupView config={household} onChange={handleUpdateHousehold} />
              )}

              {activeTab === 'appliances' && (
                <AppliancesView
                  appliances={appliances}
                  onChange={handleUpdateAppliances}
                  onLoadDemo={handleLoadDemoHousehold}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
