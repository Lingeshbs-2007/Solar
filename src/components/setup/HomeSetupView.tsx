import React, { useState } from 'react';
import {
  HouseholdConfig,
  POPULAR_LOCATIONS,
  OccupancyPattern,
  getDefaultOccupancyHours,
  LocationInfo,
} from '../../models/household';
import { LocationPicker } from '../common/LocationPicker';
import {
  Sun,
  Users,
  IndianRupee,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface HomeSetupViewProps {
  config: HouseholdConfig;
  onChange: (updated: HouseholdConfig) => void;
}

export const HomeSetupView: React.FC<HomeSetupViewProps> = ({ config, onChange }) => {
  const [error, setError] = useState<string | null>(null);

  const handleLocationChange = (name: string) => {
    const loc = POPULAR_LOCATIONS.find((l) => l.name === name);
    if (loc) {
      onChange({ ...config, location: loc });
    }
  };

  const handleCapacityChange = (valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) {
      setError('Panel capacity must be a positive number greater than 0 kW.');
    } else {
      setError(null);
    }
    onChange({
      ...config,
      panelCapacityKW: isNaN(val) ? 0 : Math.max(0, val),
    });
  };

  const handlePatternChange = (pat: OccupancyPattern) => {
    const hours = pat === 'custom' ? config.occupancyHours : getDefaultOccupancyHours(pat);
    onChange({
      ...config,
      occupancyPattern: pat,
      occupancyHours: hours,
    });
  };

  const toggleHour = (h: number) => {
    const updated = [...config.occupancyHours];
    updated[h] = !updated[h];
    onChange({
      ...config,
      occupancyPattern: 'custom',
      occupancyHours: updated,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Set up your solar home
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure your rooftop solar rating, household occupancy patterns, and tariff structure.
        </p>
      </div>

      {/* SECTION 1: SOLAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Sun className="w-4 h-4 fill-amber-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Solar PV System
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Installation Location & Precise Map
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">
                {config.location.latitude.toFixed(2)}°N, {config.location.longitude.toFixed(2)}°E
              </span>
            </label>
            <LocationPicker
              currentLocation={config.location}
              onSelectLocation={(newLoc) => onChange({ ...config, location: newLoc })}
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Tap the map pin or GPS symbol to auto-detect your exact rooftop location and weather.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Panel Capacity (kW)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={config.panelCapacityKW}
                onChange={(e) => handleCapacityChange(e.target.value)}
                className={`w-full bg-slate-50 border ${
                  error ? 'border-rose-500' : 'border-slate-200/80'
                } rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors`}
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">kW</span>
            </div>
            {error ? (
              <span className="text-[11px] text-rose-500 mt-1 block">{error}</span>
            ) : (
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard home systems range from 2.0 to 6.0 kW.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: HOUSEHOLD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Users className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Household & Occupancy
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Number of People
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.occupantsCount}
              onChange={(e) =>
                onChange({ ...config, occupantsCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Scales household standby baseline demand (~0.035 kW per occupant).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Occupancy Routine
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['office_hours', 'Office (9am-6pm away)'],
                  ['always_home', 'Home All Day'],
                  ['evening_only', 'Evening Only'],
                ] as const
              ).map(([pat, label]) => (
                <button
                  key={pat}
                  type="button"
                  onClick={() => handlePatternChange(pat)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    config.occupancyPattern === pat
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Occupied hours allow appliances flagged with &ldquo;Requires Occupancy&rdquo; to run.
            </span>
          </div>
        </div>

        {/* 24h Interactive Occupancy Bar */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1.5">
            <span>24-Hour Occupancy Grid (click hour to toggle presence):</span>
            <span className="font-mono text-emerald-700 font-semibold">
              {config.occupancyHours.filter(Boolean).length} / 24 hours home
            </span>
          </div>
          <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
            {config.occupancyHours.map((isOccupied, h) => (
              <button
                key={h}
                type="button"
                onClick={() => toggleHour(h)}
                className={`h-7 rounded flex flex-col items-center justify-center text-[9px] font-mono transition-all cursor-pointer ${
                  isOccupied
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
                title={`Hour ${h}:00 - ${h + 1}:00: ${isOccupied ? 'Home' : 'Away'}`}
              >
                <span>{h}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: ENERGY TARIFF */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <IndianRupee className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Tariff & Net Metering
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Standard Electricity Tariff (₹/kWh)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.electricityTariff}
              onChange={(e) =>
                onChange({ ...config, electricityTariff: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Default grid import price</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Export Rate / Feed-in (₹/kWh)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.exportRate}
              onChange={(e) =>
                onChange({ ...config, exportRate: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Credit for exported surplus</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Solar Export / Net Metering
            </label>
            <button
              type="button"
              onClick={() => onChange({ ...config, solarExportEnabled: !config.solarExportEnabled })}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border mt-0.5 ${
                config.solarExportEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {config.solarExportEnabled ? '✓ Net Metering Enabled' : 'Curtailed (Zero Export)'}
            </button>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {config.solarExportEnabled ? 'Surplus is credited to bill' : 'Surplus cannot be exported'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
