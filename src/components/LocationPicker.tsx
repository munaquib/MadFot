import { useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (location: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

const buildLocation = (city?: string, state?: string) => {
  const c = (city || "").trim();
  const s = (state || "").trim();
  if (!c) return "";
  return s && s !== c ? `${c}, ${s}` : c;
};

// Coordinates se city + state nikalta hai. Pehle OpenStreetMap, wo fail ho to BigDataCloud (dono free, key nahi chahiye).
// Dono fail ho jaye to "" return karta hai.
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`
    );
    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const str = buildLocation(a.city || a.town || a.village || a.state_district || a.county, a.state);
      if (str) return str;
    }
  } catch {
    // agle service par jao
  }
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const d = await res.json();
      const str = buildLocation(d.city || d.locality, d.principalSubdivision);
      if (str) return str;
    }
  } catch {
    // dono fail
  }
  return "";
};

const LocationPicker = ({ value, onChange, placeholder = "Enter your city..." }: Props) => {
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device. Please type your city.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const locationStr = await reverseGeocode(latitude, longitude);
          if (locationStr) {
            onChange(locationStr, latitude, longitude);
            toast.success(`📍 Location detected: ${locationStr}`);
          } else {
            // Coordinates mil gaye par city ka naam nahi mila: coordinates rakho, text seller khud likhe
            onChange(value, latitude, longitude);
            toast.error("Found your position but not the city name. Please type your city.");
          }
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission is blocked. Allow it in your browser's site settings, or type your city.");
        } else if (err.code === err.TIMEOUT) {
          toast.error("Location request timed out. Please try again or type your city.");
        } else {
          toast.error("Could not get your location. Please type your city.");
        }
        setDetecting(false);
      },
      { timeout: 15000, maximumAge: 300000 }
    );
  };

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-12 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
      />
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:opacity-80 transition-opacity"
        title="Detect my location"
        aria-label="Detect my location"
      >
        {detecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default LocationPicker;
