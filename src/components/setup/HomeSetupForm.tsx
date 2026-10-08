import React, { useState } from 'react';
import {
  HouseholdConfig,
  POPULAR_LOCATIONS,
  OccupancyPattern,
  getDefaultOccupancyHours,
  LocationInfo,
} from '../../models/household';
import { Sun, Users, Clock, IndianRupee, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HomeSetupFormProps {
  config: HouseholdConfig;
  onChange: (updated: HouseholdConfig) => void;
}

export const HomeSetupForm: React.FC<HomeSetupFormProps> = ({ config, onChange }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLocationChange = (cityName: string) => {
    const loc = POPULAR_LOCATIONS.find((l) => l.name === cityName);
    if (loc) {
      onChange({ ...config, location: loc });
    }
  };

  const handlePanelCapacityChange = (valStr: string) => {
    const val = parseFloat(valStr);
    const newErrors = { ...errors };

    if (isNaN(val) || val <= 0) {
      newErrors.panel = 'Panel capacity must be a positive number greater than 0 kW.';
    } else if (val > 50) {
      newErrors.panel = 'Capacity exceeds typical residential scale (max 50 kW).';
    } else {
      delete newErrors.panel;
    }
    setErrors(newErrors);

    onChange({
      ...config,
      panelCapacityKW: isNaN(val) ? 0 : Math.max(0, val),
    });
  };

  const handleOccupantsChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    const newErrors = { ...errors };

    if (isNaN(val) || val < 1) {
      newErrors.occupants = 'Occupants count must be at least 1 person.';
    } else if (val > 20) {
      newErrors.occupants = 'Occupants count exceeds realistic home size (max 20).';
    } else {
      delete newErrors.occupants;
    }
    setErrors(newErrors);

    onChange({
      ...config,
      occupantsCount: isNaN(val) || val < 1 ? 1 : val,
    });
  };

  const handlePatternChange = (pattern: OccupancyPattern) => {
    const updatedHours = pattern === 'custom' ? config.occupancyHours : getDefaultOccupancyHours(pattern);
    onChange({
      ...config,
      occupancyPattern: pattern,
      occupancyHours: updatedHours,
    });
  };

  const toggleOccupancyHour = (hourIndex: number) => {
    const updated = [...config.occupancyHours];
    updated[hourIndex] = !updated[hourIndex];
    onChange({
      ...config,
      occupancyPattern: 'custom',
      occupancyHours: updated,
    });
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-400" />
            Household & Solar Setup
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define your solar array rating, occupancy habits, and electricity tariffs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            Installation Location
          </label>
          <select
            value={config.location.name}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          >
            {POPULAR_LOCATIONS.map((loc) => (
              <option key={loc.name} value={loc.name}>
                {loc.name} ({loc.latitude > 0 ? `${loc.latitude.toFixed(1)}°N` : `${Math.abs(loc.latitude).toFixed(1)}°S`})
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Used to query solar irradiance and weather forecast for tomorrow.
          </span>
        </div>

        {/* Panel Capacity in kW */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            Rooftop Solar PV Rating (kW)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              value={config.panelCapacityKW}
              onChange={(e) => handlePanelCapacityChange(e.target.value)}
              className={`w-full bg-slate-950 border ${
                errors.panel ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
              } rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500`}
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">kW</span>
          </div>
          {errors.panel ? (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.panel}
            </p>
          ) : (
            <span className="text-[11px] text-slate-500 mt-1 block">
              Standard residential systems range from 2 kW to 6 kW.
            </span>
          )}
        </div>

        {/* Number of People */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Household Occupants
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="20"
              value={config.occupantsCount}
              onChange={(e) => handleOccupantsChange(e.target.value)}
              className={`w-full bg-slate-950 border ${
                errors.occupants ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
              } rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500`}
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500">people</span>
          </div>
          {errors.occupants ? (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.occupants}
            </p>
          ) : (
            <span className="text-[11px] text-slate-500 mt-1 block">
              Calculates ~0.035 kW background baseline standby per occupant.
            </span>
          )}
        </div>
      </div>

      {/* Occupancy Profile */}
      <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Occupancy Pattern (When Someone is Home)
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Appliances flagged with &ldquo;Requires Occupancy&rdquo; (e.g. Washing Machine) will only be scheduled when someone is home.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['office_hours', 'Office (9am-6pm away)'],
                ['always_home', 'Home All Day'],
                ['evening_only', 'Evening Only'],
                ['morning_evening', 'Morning & Evening'],
              ] as const
            ).map(([pat, label]) => (
              <button
                key={pat}
                type="button"
                onClick={() => handlePatternChange(pat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  config.occupancyPattern === pat
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 24-hour occupancy timeline buttons */}
        <div>
          <div className="text-[11px] text-slate-500 mb-1 flex justify-between">
            <span>24-Hour Occupancy Grid (click any hour to toggle):</span>
            <span className="text-amber-400 font-mono">
              {config.occupancyHours.filter(Boolean).length} / 24 hours home
            </span>
          </div>
          <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
            {config.occupancyHours.map((isOccupied, h) => (
              <button
                key={h}
                type="button"
                onClick={() => toggleOccupancyHour(h)}
                className={`h-8 rounded flex flex-col items-center justify-center text-[10px] font-mono transition-all cursor-pointer ${
                  isOccupied
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800'
                }`}
                title={`Hour ${h}:00 - ${h + 1}:00: ${isOccupied ? 'Occupied (Home)' : 'Away'}`}
              >
                <span>{h}</span>
                <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ backgroundColor: isOccupied ? '#10b981' : '#475569' }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/60 inline-block" />
              Home (Occupied)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800 inline-block" />
              Away
            </span>
          </div>
        </div>
      </div>

      {/* Electricity Tariffs & Optional TOU / Net Metering */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            Standard Tariff (₹/kWh)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={config.electricityTariff}
            onChange={(e) =>
              onChange({ ...config, electricityTariff: Math.max(0, parseFloat(e.target.value) || 0) })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Default grid import price</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            Solar Export / Feed-in Rate (₹/kWh)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={config.exportRate}
            onChange={(e) =>
              onChange({ ...config, exportRate: Math.max(0, parseFloat(e.target.value) || 0) })
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">Feed-in tariff credited for surplus</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Peak-Hour Pricing
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => onChange({ ...config, peakPricingEnabled: !config.peakPricingEnabled })}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer w-full flex items-center justify-center gap-2 ${
                config.peakPricingEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {config.peakPricingEnabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  Peak Pricing Active
                </>
              ) : (
                'Flat Rate Only'
              )}
            </button>
          </div>
          {config.peakPricingEnabled && (
            <span className="text-[11px] text-amber-400/90 mt-1 block font-mono">
              ₹{config.peakTariff}/kWh ({config.peakStartHour}:00 - {config.peakEndHour}:00)
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Sun className="w-3.5 h-3.5 text-emerald-400" />
            Net Metering / Solar Export
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => onChange({ ...config, solarExportEnabled: !config.solarExportEnabled })}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer w-full flex items-center justify-center gap-2 ${
                config.solarExportEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {config.solarExportEnabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Net Metering Enabled
                </>
              ) : (
                'Zero Export (Curtailed)'
              )}
            </button>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {config.solarExportEnabled ? 'Surplus sold back to grid' : 'Surplus cannot be exported'}
          </span>
        </div>
      </div>
    </div>
  );
};
