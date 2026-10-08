import React, { useState, useEffect } from 'react';
import {
  Appliance,
  APPLIANCE_CATALOG_TEMPLATES,
  validateAppliance,
  AppliancePriority,
} from '../../models/appliance';
import { X, Sparkles } from 'lucide-react';

interface ApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appliance: Appliance) => void;
  initialAppliance?: Appliance | null;
}

export const ApplianceModal: React.FC<ApplianceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAppliance,
}) => {
  const [formData, setFormData] = useState<Appliance>({
    id: `app-${Date.now()}`,
    name: '',
    category: 'other',
    powerKW: 1.0,
    durationHours: 1.0,
    normalStartHour: 18,
    flexible: true,
    allowedStartHour: 10,
    allowedEndHour: 20,
    requiresOccupancy: false,
    priority: 'medium',
    daysApplicable: 'all',
    enabled: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialAppliance) {
      setFormData(initialAppliance);
    } else {
      setFormData({
        id: `app-${Date.now()}`,
        name: '',
        category: 'other',
        powerKW: 1.0,
        durationHours: 1.0,
        normalStartHour: 18,
        flexible: true,
        allowedStartHour: 10,
        allowedEndHour: 20,
        requiresOccupancy: false,
        priority: 'medium',
        daysApplicable: 'all',
        enabled: true,
      });
    }
    setErrors({});
  }, [initialAppliance, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (idx: number) => {
    const tmpl = APPLIANCE_CATALOG_TEMPLATES[idx];
    if (tmpl) {
      setFormData((prev) => ({
        ...prev,
        name: tmpl.name,
        category: tmpl.category,
        powerKW: tmpl.powerKW,
        durationHours: tmpl.durationHours,
        normalStartHour: tmpl.normalStartHour,
        flexible: tmpl.flexible,
        allowedStartHour: tmpl.allowedStartHour,
        allowedEndHour: tmpl.allowedEndHour,
        requiresOccupancy: tmpl.requiresOccupancy,
        priority: tmpl.priority,
        daysApplicable: tmpl.daysApplicable,
      }));
      setErrors({});
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAppliance(formData);

    if (validationErrors.length > 0) {
      const errMap: Record<string, string> = {};
      validationErrors.forEach((err) => {
        errMap[err.field] = err.message;
      });
      setErrors(errMap);
      return;
    }

    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-base font-bold text-slate-900">
            {initialAppliance ? 'Edit Appliance' : 'Add New Appliance'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick template chooser */}
        {!initialAppliance && (
          <div className="mb-4 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
            <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Quick Preset Templates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {APPLIANCE_CATALOG_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(idx)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-slate-700 border border-amber-200/80 transition-colors cursor-pointer"
                >
                  {tmpl.name} ({tmpl.powerKW}kW)
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appliance Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Dishwasher, EV Charger"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full bg-slate-50 border ${
                  errors.name ? 'border-rose-500' : 'border-slate-200'
                } rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600`}
              />
              {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as Appliance['category'] })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="kitchen">Kitchen</option>
                <option value="laundry">Laundry</option>
                <option value="water_heating">Water Heating</option>
                <option value="cooling">Cooling / AC</option>
                <option value="ev">Electric Vehicle</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other / Utility</option>
              </select>
            </div>
          </div>

          {/* Power & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rated Power Draw (kW) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="30"
                  value={formData.powerKW}
                  onChange={(e) =>
                    setFormData({ ...formData, powerKW: parseFloat(e.target.value) || 0 })
                  }
                  className={`w-full bg-slate-50 border ${
                    errors.powerKW ? 'border-rose-500' : 'border-slate-200'
                  } rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600`}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">kW</span>
              </div>
              {errors.powerKW && <p className="text-[11px] text-rose-500 mt-1">{errors.powerKW}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operating Duration (Hours) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={formData.durationHours}
                  onChange={(e) =>
                    setFormData({ ...formData, durationHours: parseFloat(e.target.value) || 0 })
                  }
                  className={`w-full bg-slate-50 border ${
                    errors.durationHours ? 'border-rose-500' : 'border-slate-200'
                  } rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600`}
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">hrs</span>
              </div>
              {errors.durationHours && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.durationHours}</p>
              )}
            </div>
          </div>

          {/* Normal Start Hour & Flexibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Normal / Preferred Start Hour
              </label>
              <select
                value={formData.normalStartHour}
                onChange={(e) =>
                  setFormData({ ...formData, normalStartHour: parseInt(e.target.value, 10) })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {h < 10 ? `0${h}` : h}:00 ({h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduling Flexibility
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, flexible: true })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    formData.flexible
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Flexible (Shiftable)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, flexible: false })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    !formData.flexible
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Fixed (Strict)
                </button>
              </div>
            </div>
          </div>

          {/* Allowed Window when Flexible */}
          {formData.flexible && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Allowed Operating Window
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Earliest Start</label>
                  <select
                    value={formData.allowedStartHour}
                    onChange={(e) =>
                      setFormData({ ...formData, allowedStartHour: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    {Array.from({ length: 24 }).map((_, h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Latest End</label>
                  <select
                    value={formData.allowedEndHour}
                    onChange={(e) =>
                      setFormData({ ...formData, allowedEndHour: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    {Array.from({ length: 25 }).map((_, h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errors.allowedEndHour && (
                <p className="text-[11px] text-rose-500">{errors.allowedEndHour}</p>
              )}
            </div>
          )}

          {/* Occupancy & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="requiresOccupancy"
                checked={formData.requiresOccupancy}
                onChange={(e) => setFormData({ ...formData, requiresOccupancy: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="requiresOccupancy" className="text-xs text-slate-700 font-medium cursor-pointer">
                Requires Occupancy (someone home)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as AppliancePriority })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900"
              >
                <option value="high">High (Schedule first)</option>
                <option value="medium">Medium</option>
                <option value="low">Low (Flexible filler)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer"
            >
              {initialAppliance ? 'Save Changes' : 'Add Appliance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
