import React, { useState } from 'react';
import { Appliance } from '../../models/appliance';
import { ApplianceModal } from './ApplianceModal';
import {
  Plus,
  Edit2,
  Trash2,
  Zap,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface AppliancesViewProps {
  appliances: Appliance[];
  onChange: (updated: Appliance[]) => void;
  onLoadDemo: () => void;
}

export const AppliancesView: React.FC<AppliancesViewProps> = ({
  appliances,
  onChange,
  onLoadDemo,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);

  const formatHour12 = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  const handleOpenAdd = () => {
    setEditingAppliance(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (app: Appliance) => {
    setEditingAppliance(app);
    setModalOpen(true);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your Home&apos;s Appliances
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tell us when your appliances normally run. We&apos;ll find better solar-powered windows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Demo Home</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Appliance</span>
          </button>
        </div>
      </div>

      {/* Appliance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appliances.map((app) => {
          return (
            <div
              key={app.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs transition-all relative flex flex-col justify-between ${
                app.enabled
                  ? 'border-slate-200/80 hover:border-slate-300'
                  : 'border-slate-200/40 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-base">
                      {app.name.toLowerCase().includes('wash')
                        ? '🧺'
                        : app.name.toLowerCase().includes('dish')
                        ? '🍽'
                        : app.name.toLowerCase().includes('water')
                        ? '🚿'
                        : app.name.toLowerCase().includes('ev')
                        ? '🚗'
                        : app.name.toLowerCase().includes('fridge')
                        ? '❄️'
                        : '⚡'}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{app.name}</h3>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {app.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(app)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(app.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Specs List */}
                <div className="space-y-1.5 text-xs text-slate-600 font-mono py-2 border-y border-slate-100">
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Power:</span>
                    <span className="font-bold text-slate-900">{app.powerKW} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Duration:</span>
                    <span>{app.durationHours} hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-slate-500">Normal time:</span>
                    <span className="font-bold text-slate-900">{formatHour12(app.normalStartHour)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-slate-500">Flexible:</span>
                    <span>
                      {app.flexible ? (
                        <span className="text-emerald-700 font-bold font-sans">✓ Yes</span>
                      ) : (
                        <span className="text-slate-400 font-sans">Strict</span>
                      )}
                    </span>
                  </div>
                  {app.flexible && (
                    <div className="flex justify-between">
                      <span className="font-sans text-slate-500">Allowed window:</span>
                      <span className="text-amber-700 font-bold">
                        {formatHour12(app.allowedStartHour)} &ndash; {formatHour12(app.allowedEndHour)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {app.requiresOccupancy && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Occupied
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {app.priority}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(app)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                >
                  [Edit]
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
