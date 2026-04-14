import { useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (location: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

const LocationPicker = ({ value, onChange, placeholder = "Enter your city..." }: Props) => {
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("GPS not supported on this device");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode using free API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state_district ||
            "Your Location";
          const state = data.address?.state || "";
          const locationStr = state ? `${city}, ${state}` : city;
          onChange(locationStr, latitude, longitude);
          toast.success(`📍 Location detected: ${locationStr}`);
        } catch {
          onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude);
        }
        setDetecting(false);
      },
      (err) => {
        toast.error("Could not detect location. Please enter manually.");
        setDetecting(false);
      },
      { timeout: 10000 }
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
