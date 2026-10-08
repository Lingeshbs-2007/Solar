import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  Check,
  X,
  Compass,
  Loader2,
  Navigation,
  Globe2,
  AlertCircle
} from 'lucide-react';
import { LocationInfo, POPULAR_LOCATIONS } from '../../models/household';

interface LocationPickerProps {
  currentLocation: LocationInfo;
  onSelectLocation: (location: LocationInfo) => void;
  className?: string;
  variant?: 'full' | 'compact';
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  currentLocation,
  onSelectLocation,
  className = '',
  variant = 'full',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Precision pin coordinates state inside the modal
  const [pinLat, setPinLat] = useState<number>(currentLocation.latitude);
  const [pinLng, setPinLng] = useState<number>(currentLocation.longitude);
  const [pinName, setPinName] = useState<string>(currentLocation.name);
  const [pinTz, setPinTz] = useState<string>(currentLocation.timezone);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Sync pin state when modal opens or currentLocation changes
  useEffect(() => {
    setPinLat(currentLocation.latitude);
    setPinLng(currentLocation.longitude);
    setPinName(currentLocation.name);
    setPinTz(currentLocation.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata');
  }, [currentLocation, isOpen]);

  // Reverse geocode lat/lng to human readable name using Nominatim (free, open reverse geocoder)
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const address = data.address || {};
        const neighborhood = address.suburb || address.neighbourhood || address.residential || address.city_district;
        const city = address.city || address.town || address.village || address.county || address.state_district;
        const country = address.country;
        
        let formatted = '';
        if (neighborhood && city) {
          formatted = `${neighborhood}, ${city}`;
        } else if (city && country) {
          formatted = `${city}, ${country}`;
        } else if (data.display_name) {
          const parts = data.display_name.split(',');
          formatted = parts.slice(0, 2).join(',').trim();
        } else {
          formatted = `Custom Pin (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
        }

        // Estimate timezone from browser or Indian/default standard
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        setPinName(formatted);
        setPinTz(tz);
      } else {
        setPinName(`Pin (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
      }
    } catch {
      setPinName(`Exact Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // User touches "Use My Current GPS Location"
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setPinLat(lat);
        setPinLng(lng);

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        setPinTz(tz);

        // Reverse geocode to find neighborhood/city
        await reverseGeocode(lat, lng);
        setIsLocatingGPS(false);
      },
      (err) => {
        setIsLocatingGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. You can search or drag the pin on the map.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('Position unavailable. Please try typing your area or clicking on the map.');
        } else {
          setGpsError('Could not acquire location in time.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Direct 1-click GPS from the toolbar button (outside modal or inside)
  const handleQuickLocateDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      setIsOpen(true);
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

        // Quick geocode
        let name = `Precise GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
          );
          if (resp.ok) {
            const data = await resp.json();
            const address = data.address || {};
            const neighborhood = address.suburb || address.neighbourhood || address.city_district;
            const city = address.city || address.town || address.village;
            const country = address.country;
            if (neighborhood && city) {
              name = `${neighborhood}, ${city}`;
            } else if (city && country) {
              name = `${city}, ${country}`;
            }
          }
        } catch {}

        onSelectLocation({
          name,
          latitude: lat,
          longitude: lng,
          timezone: tz,
        });
        setIsLocatingGPS(false);
      },
      (err) => {
        setIsLocatingGPS(false);
        // If permission error or failure, open modal so user can pick
        setIsOpen(true);
        setGpsError(err.message || 'Location permission required');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Search places using OpenStreetMap Nominatim
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5&addressdetails=1`
      );
      if (resp.ok) {
        const data = await resp.json();
        const results: LocationInfo[] = data.map((item: any) => ({
          name: item.display_name.split(',').slice(0, 2).join(',').trim(),
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        }));
        setSearchResults(results);
      }
    } catch {
      // Fallback search in popular locations
      const filtered = POPULAR_LOCATIONS.filter((l) =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm and apply location
  const handleApplyLocation = () => {
    onSelectLocation({
      name: pinName,
      latitude: Number(pinLat.toFixed(5)),
      longitude: Number(pinLng.toFixed(5)),
      timezone: pinTz,
    });
    setIsOpen(false);
  };

  // Interactive Map preview calculation
  // We embed an OpenStreetMap iframe focused directly on the pin coordinates with a marker
  const mapIframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${pinLng - 0.05}%2C${
    pinLat - 0.03
  }%2C${pinLng + 0.05}%2C${pinLat + 0.03}&layer=mapnik&marker=${pinLat}%2C${pinLng}`;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Area: Map Pin Button & Location Display */}
      {variant === 'compact' ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 transition-colors cursor-pointer group shadow-2xs"
            title="Click to view map or change coordinates"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20" />
            <span className="max-w-[130px] truncate">{currentLocation.name.split(',')[0]}</span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              ({currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°)
            </span>
          </button>

          <button
            type="button"
            onClick={handleQuickLocateDirect}
            disabled={isLocatingGPS}
            className={`p-1.5 rounded-xl border flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
              isLocatingGPS
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse'
                : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 border-slate-200 text-emerald-700'
            }`}
            title="Auto-detect my live GPS location"
          >
            {isLocatingGPS ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <Crosshair className="w-4 h-4 text-emerald-600" />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl px-3 py-2.5 text-left text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-600 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
              title="Click to view map and select precise coordinates"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-800 block truncate">{currentLocation.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {currentLocation.latitude.toFixed(4)}° N, {currentLocation.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60 group-hover:bg-emerald-100 shrink-0 transition-colors">
                Change Pin
              </span>
            </button>
          </div>

          {/* Dedicated Google Maps-style Precise Location Target Button */}
          <button
            type="button"
            onClick={handleQuickLocateDirect}
            disabled={isLocatingGPS}
            className={`h-[42px] px-3.5 rounded-xl border flex items-center gap-1.5 font-semibold text-xs transition-all shadow-2xs cursor-pointer shrink-0 ${
              isLocatingGPS
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse'
                : 'bg-white hover:bg-emerald-50/80 hover:text-emerald-700 hover:border-emerald-300 border-slate-200/90 text-slate-700 active:scale-95'
            }`}
            title="Detect my exact live location via GPS"
          >
            {isLocatingGPS ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span className="hidden sm:inline">Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
                <span className="hidden sm:inline">Locate Me</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MODAL: Precise Interactive Map & Coordinates Selection */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <MapPin className="w-4 h-4 fill-emerald-500/20" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                    Precise Solar Location
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Solar irradiance and rooftop weather calculate from exact coordinates.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* GPS Alert error if any */}
              {gpsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {/* Action Toolbar: GPS Auto-Detect + Search Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocatingGPS}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {isLocatingGPS ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5" />
                  )}
                  <span>{isLocatingGPS ? 'Getting exact GPS...' : 'Use My Current GPS'}</span>
                </button>

                <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search city, neighborhood, or postal area..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
                  </button>
                </form>
              </div>

              {/* Search Suggestions Dropdown if results */}
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-xl bg-white shadow-md overflow-hidden text-xs divide-y divide-slate-100">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Search Results
                  </div>
                  {searchResults.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPinLat(loc.latitude);
                        setPinLng(loc.longitude);
                        setPinName(loc.name);
                        setSearchResults([]);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 flex items-center justify-between text-slate-800 transition-colors"
                    >
                      <span className="font-semibold">{loc.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {loc.latitude.toFixed(3)}°, {loc.longitude.toFixed(3)}°
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Interactive OpenStreetMap Pin Map */}
              <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 shadow-inner h-52 sm:h-64">
                <iframe
                  title="Precise Solar Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={mapIframeSrc}
                  className="w-full h-full border-0 pointer-events-auto"
                />

                {/* Overlaid Live Pin Badge */}
                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-xl px-2.5 py-1.5 shadow-sm text-xs space-y-0.5 pointer-events-none max-w-[80%]">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <MapPin className="w-3.5 h-3.5 fill-emerald-500" />
                    <span className="truncate">{pinName}</span>
                    {isReverseGeocoding && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Lat: {pinLat.toFixed(5)}° | Lng: {pinLng.toFixed(5)}°
                  </div>
                </div>

                {/* Open in Google Maps full link */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${pinLat},${pinLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-slate-700 text-[10px] font-semibold px-2 py-1 rounded-lg border border-slate-200 shadow-xs flex items-center gap-1 transition-colors"
                >
                  <Globe2 className="w-3 h-3 text-blue-600" />
                  <span>View in Google Maps</span>
                </a>
              </div>

              {/* Exact Coordinate Fine-Tuning Controls */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    Fine-tune Exact Coordinates
                  </span>
                  <span className="text-[10px] text-slate-400">Rooftop precision</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      Latitude (°N)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pinLat}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setPinLat(val);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      Longitude (°E)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={pinLng}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setPinLng(val);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                    Location Label / Custom Rooftop Name
                  </label>
                  <input
                    type="text"
                    value={pinName}
                    onChange={(e) => setPinName(e.target.value)}
                    placeholder="e.g. My Rooftop, Indiranagar"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Quick Select Preset Major Cities */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Or pick a major city preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_LOCATIONS.slice(0, 7).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setPinLat(preset.latitude);
                        setPinLng(preset.longitude);
                        setPinName(preset.name);
                        setPinTz(preset.timezone);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        pinName === preset.name
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {preset.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyLocation}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Location</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
