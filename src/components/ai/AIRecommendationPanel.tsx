import React from 'react';
import { AIExplanationResult } from '../../services/aiRecommendation';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  RefreshCw,
  Compass,
} from 'lucide-react';

interface AIRecommendationPanelProps {
  explanation: AIExplanationResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({
  explanation,
  isLoading,
  onRefresh,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              AI Decision Explanation & Guidance
            </h3>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Ground-Truth Interpreted
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Objective explanation of algorithmic appliance shifts, solar synchronization, and grid reduction.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Interpreting...' : 'Re-explain'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">
            Synthesizing deterministic optimization decisions through Gemini 3.8 Flash...
          </p>
        </div>
      ) : explanation ? (
        <div className="space-y-4 text-xs">
          {/* Headline banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <h4 className="text-sm sm:text-base font-bold text-amber-300">
              {explanation.headline}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {explanation.summaryParagraph}
            </p>
          </div>

          {/* Key Insights & Decisions */}
          <div>
            <h5 className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Optimization Insights & Why Shifts Were Made
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {explanation.keyInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-slate-300 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold font-mono">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed text-[11px]">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Homeowner Guidance */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
            <h5 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Actionable Guidance for the Household
            </h5>
            <ul className="space-y-1.5 text-slate-300">
              {explanation.actionableGuidance.map((guide, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{guide}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confidence Assessment */}
          <div className="pt-2 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{explanation.confidenceAssessment}</span>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">
              Source: {explanation.source === 'gemini-live' ? 'Gemini 3.8 Flash' : 'Deterministic Engine'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
