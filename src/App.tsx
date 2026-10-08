import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HouseholdConfig,
  DEFAULT_HOUSEHOLD_CONFIG,
  getDefaultOccupancyHours,
  LocationInfo,
} from './models/household';
import { Appliance, DEMO_APPLIANCES } from './models/appliance';
import { SolarForecastResult } from './models/forecast';
import { ImpactSummary } from './models/impact';
import { getSolarForecastForHousehold } from './services/weather';
import { calculateImpactSummary } from './engines/impactCalculator';
import { AIExplanationResult, getAIOptimizationExplanation } from './services/aiRecommendation';
import {
  getHouseholdSignature,
  getAppliancesSignature,
  StoredOptimizationPlan,
} from './utils/signatures';

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
  // Single Source of Truth for Household & Appliances with safe localStorage restoration
  const [household, setHouseholdState] = useState<HouseholdConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HOUSEHOLD);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.location && typeof parsed.panelCapacityKW === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed restoring household from storage:', e);
    }
    return DEFAULT_HOUSEHOLD_CONFIG;
  });

  const [appliances, setAppliancesState] = useState<Appliance[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPLIANCES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
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

  // Update household wrapper that flags plan and immediately recalculates impact if forecast exists
  const handleUpdateHousehold = useCallback((updated: HouseholdConfig) => {
    setHouseholdState(updated);
    try {
      localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    if (forecast) {
      const newImpact = calculateImpactSummary(appliances, forecast, updated);
      setImpactSummary(newImpact);
      setIsPlanStale(false);
      try {
        const planRecord: StoredOptimizationPlan = {
          householdSignature: getHouseholdSignature(updated),
          applianceSignature: getAppliancesSignature(appliances),
          forecast,
          impact: newImpact,
          generatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(planRecord));
      } catch (e) {}
    } else {
      setIsPlanStale(true);
    }
    setAiExplanation(null);
  }, [appliances, forecast]);

  // Update appliances wrapper that flags plan and immediately recalculates impact if forecast exists
  const handleUpdateAppliances = useCallback((updated: Appliance[]) => {
    setAppliancesState(updated);
    try {
      localStorage.setItem(STORAGE_KEY_APPLIANCES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }

    if (forecast) {
      const newImpact = calculateImpactSummary(updated, forecast, household);
      setImpactSummary(newImpact);
      setIsPlanStale(false);
      try {
        const planRecord: StoredOptimizationPlan = {
          householdSignature: getHouseholdSignature(household),
          applianceSignature: getAppliancesSignature(updated),
          forecast,
          impact: newImpact,
          generatedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(planRecord));
      } catch (e) {}
    } else {
      setIsPlanStale(true);
    }
    setAiExplanation(null);
  }, [household, forecast]);

  // Staged Execution Pipeline: Generate Tomorrow's Plan
  const handleGeneratePlan = useCallback(
    async (customHousehold?: HouseholdConfig, customAppliances?: Appliance[]) => {
      const targetHousehold = customHousehold || household;
      const targetAppliances = customAppliances || appliances;

      setIsGeneratingPlan(true);

      try {
        // Stage 1: Fetching solar forecast
        setGenerationStage('1. Fetching solar forecast...');
        await new Promise((r) => setTimeout(r, 220));
        const newForecast = await getSolarForecastForHousehold(
          targetHousehold.location,
          targetHousehold.panelCapacityKW
        );
        setForecast(newForecast);

        // Stage 2: Estimating household demand
        setGenerationStage('2. Estimating household demand...');
        await new Promise((r) => setTimeout(r, 180));

        // Stage 3: Analyzing solar-demand balance
        setGenerationStage('3. Analyzing solar-demand balance...');
        await new Promise((r) => setTimeout(r, 180));

        // Stage 4: Optimizing flexible appliance schedules
        setGenerationStage('4. Optimizing flexible appliance schedules...');
        await new Promise((r) => setTimeout(r, 200));

        // Stage 5: Calculating expected impact
        setGenerationStage('5. Calculating expected impact...');
        await new Promise((r) => setTimeout(r, 160));
        const newImpact = calculateImpactSummary(targetAppliances, newForecast, targetHousehold);
        setImpactSummary(newImpact);

        // Stage 6: Preparing recommendation
        setGenerationStage('6. Preparing recommendation...');
        await new Promise((r) => setTimeout(r, 150));

        setIsPlanStale(false);

        // Persist generated plan with deterministic signatures
        try {
          const planRecord: StoredOptimizationPlan = {
            householdSignature: getHouseholdSignature(targetHousehold),
            applianceSignature: getAppliancesSignature(targetAppliances),
            forecast: newForecast,
            impact: newImpact,
            generatedAt: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(planRecord));
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

  // Directly update location and re-run solar forecast for new coordinates immediately
  const handleUpdateLocation = useCallback(
    (newLocation: LocationInfo) => {
      const updatedHousehold: HouseholdConfig = {
        ...household,
        location: newLocation,
      };
      setHouseholdState(updatedHousehold);
      try {
        localStorage.setItem(STORAGE_KEY_HOUSEHOLD, JSON.stringify(updatedHousehold));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      // Re-trigger solar forecast & optimization plan for the precise location
      handleGeneratePlan(updatedHousehold);
    },
    [household, handleGeneratePlan]
  );

  // On mount: restore previous plan with signature validation, or generate plan
  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;

    try {
      const savedPlanStr = localStorage.getItem(STORAGE_KEY_PLAN);
      if (savedPlanStr) {
        const parsed: StoredOptimizationPlan = JSON.parse(savedPlanStr);
        if (parsed && parsed.forecast && parsed.impact) {
          const curHSig = getHouseholdSignature(household);
          const curASig = getAppliancesSignature(appliances);

          // Plan is valid ONLY if both current signatures match the saved signatures
          const isSignatureMatch =
            parsed.householdSignature === curHSig &&
            parsed.applianceSignature === curASig;

          setForecast(parsed.forecast);
          setImpactSummary(parsed.impact);

          if (isSignatureMatch) {
            setIsPlanStale(false);
            // Request AI explanation for validated plan
            setIsAiLoading(true);
            getAIOptimizationExplanation(parsed.impact)
              .then((res) => setAiExplanation(res))
              .catch(() => {})
              .finally(() => setIsAiLoading(false));
            return;
          } else {
            // Signatures differ: household or appliance configuration changed while offline!
            setIsPlanStale(true);
            setAiExplanation(null);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore saved plan safely, resetting:', e);
      try {
        localStorage.removeItem(STORAGE_KEY_PLAN);
      } catch {}
    }

    // Generate initial plan if none saved or storage corrupted
    handleGeneratePlan();
  }, [handleGeneratePlan, household, appliances]);

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
    setIsPlanStale(true);
    setAiExplanation(null);

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
                  location={household.location}
                  onSelectLocation={handleUpdateLocation}
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
