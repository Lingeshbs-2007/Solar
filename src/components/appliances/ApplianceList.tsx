import React, { useState } from 'react';
import { Appliance } from '../../models/appliance';
import {
  Plus,
  Edit2,
  Trash2,
  Zap,
  Clock,
  UserCheck,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { ApplianceModal } from './ApplianceModal';

interface ApplianceListProps {
  appliances: Appliance[];
  onChange: (updated: Appliance[]) => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = ({ appliances, onChange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'flexible' | 'fixed'>('all');

  const handleToggleEnable = (id: string) => {
    onChange(
      appliances.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleDelete = (id: string) => {
    onChange(appliances.filter((a) => a.id !== id));
  };

  const handleSaveAppliance = (app: Appliance) => {
    const exists = appliances.some((a) => a.id === app.id);
    if (exists) {
      onChange(appliances.map((a) => (a.id === app.id ? app : a)));
    } else {
      onChange([...appliances, app]);
    }
  };

  const handleOpenAdd = () => {
    setEditingAppliance(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (app: Appliance) => {
    setEditingAppliance(app);
    setModalOpen(true);
  };

  const filteredAppliances = appliances.filter((a) => {
    if (filterType === 'flexible') return a.flexible;
    if (filterType === 'fixed') return !a.flexible;
    return true;
  });

  const totalConnectedPower = appliances
    .filter((a) => a.enabled)
    .reduce((sum, a) => sum + a.powerKW, 0);

  const totalCycleEnergy = appliances
    .filter((a) => a.enabled)
    .reduce((sum, a) => sum + a.powerKW * a.durationHours, 0);

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Household Appliance Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure power, durations, preferred schedules, and flexible windows for greedy scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(
              [
                ['all', 'All'],
                ['flexible', 'Flexible'],
                ['fixed', 'Fixed'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Appliance</span>
          </button>
        </div>
      </div>

      {/* Aggregate Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Total Appliances</span>
          <span className="font-bold text-slate-200 text-sm font-mono">
            {appliances.length} ({appliances.filter((a) => a.enabled).length} active)
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Flexible Shiftable</span>
          <span className="font-bold text-amber-400 text-sm font-mono">
            {appliances.filter((a) => a.flexible && a.enabled).length} units
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Active Peak Load</span>
          <span className="font-bold text-slate-200 text-sm font-mono">
            {totalConnectedPower.toFixed(2)} kW
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">Daily Energy Demand</span>
          <span className="font-bold text-emerald-400 text-sm font-mono">
            {totalCycleEnergy.toFixed(2)} kWh
          </span>
        </div>
      </div>

      {/* Grid of Appliance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredAppliances.map((app) => {
          const runEnergy = (app.powerKW * app.durationHours).toFixed(2);
          return (
            <div
              key={app.id}
              className={`rounded-xl border p-4 transition-all relative ${
                app.enabled
                  ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                    {app.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {app.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(app)}
                    className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit appliance settings"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(app.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Remove appliance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Energy metrics */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300 mb-3 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-amber-400 font-bold">{app.powerKW} kW</span>
                <span className="text-slate-600">&times;</span>
                <span>{app.durationHours}h run</span>
                <span className="text-slate-600">=</span>
                <span className="text-emerald-400 font-semibold">{runEnergy} kWh</span>
              </div>

              {/* Schedule details */}
              <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Normal start:
                  </span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {app.normalStartHour < 10 ? `0${app.normalStartHour}` : app.normalStartHour}:00
                  </span>
                </div>

                {app.flexible ? (
                  <div className="flex items-center justify-between text-amber-300/90">
                    <span>Allowed window:</span>
                    <span className="font-mono text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {app.allowedStartHour}:00 - {app.allowedEndHour}:00
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Window:</span>
                    <span className="text-[11px]">Strict (Fixed)</span>
                  </div>
                )}
              </div>

              {/* Badges & Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      app.flexible
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {app.flexible ? 'Flexible' : 'Fixed'}
                  </span>

                  {app.requiresOccupancy && (
                    <span
                      className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                      title="Requires household occupancy"
                    >
                      <UserCheck className="w-3 h-3" />
                      Occupied
                    </span>
                  )}

                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">
                    {app.priority}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleEnable(app.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    app.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {app.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ApplianceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveAppliance}
        initialAppliance={editingAppliance}
      />
    </div>
  );
};
