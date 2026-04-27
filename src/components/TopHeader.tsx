import { useState, useEffect, useRef } from "react";
import { Search, MapPin, User, ShoppingCart, Crown, Menu, SlidersHorizontal, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const marqueeItems = [
  "🔥 Flat 80% Off on Bridal Lehengas",
  "✨ New Arrivals: Designer Sherwani Collection",
  "🎉 Free Shipping on Orders Above ₹2,000",
  "💎 Authenticity Guaranteed on Every Product",
  "👗 Sell Your Pre-Owned Fashion & Earn Cash",
  "🛡️ Secure Payments with Razorpay",
  "⭐ Top Rated Sellers Near You",
];

interface TopHeaderProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onFilterClick?: () => void;
}

const TopHeader = ({ sidebarOpen, onToggleSidebar, onFilterClick }: TopHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [city, setCity] = useState("Detecting...");
  const [searchQuery, setSearchQuery] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSearch = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    import("sonner").then(({ toast }) => {
      toast.info("Image search coming soon! 📸 AI will find similar products.");
    });
    e.target.value = "";
  };

  const detectCity = async (pos: GeolocationPosition) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
      );
      const data = await res.json();
      const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || "Unknown";
      setCity(cityName);
    } catch {
      setCity("Meerut");
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => detectCity(pos),
        () => setCity("Meerut")
      );
    } else {
      setCity("Meerut");
    }
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const refreshLocation = () => {
    setCity("Detecting...");
    navigator.geolocation?.getCurrentPosition(
      (pos) => detectCity(pos),
      () => setCity("Meerut")
    );
  };

  return (
    <div className="w-full sticky top-0 z-50">
      {/* Main Header Bar */}
      <div className="bg-primary px-4 py-2.5">
        <div className="max-w-[1300px] mx-auto flex items-center gap-3">
          {/* Sidebar toggle - desktop only */}
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex items-center justify-center w-8 h-8 text-secondary/80 hover:text-secondary transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo */}
          <div
            className={`flex items-center gap-2 cursor-pointer shrink-0 ${sidebarOpen ? "lg:hidden" : ""}`}
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-extrabold text-secondary font-serif block">MadFod</h1>
          </div>

          {/* Search Bar — full width, longer */}
          <div className="relative flex-1 mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search lehenga, sherwani, saree..."
              className="w-full bg-card rounded-lg py-2 pl-9 pr-[72px] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                onClick={handleImageSearch}
                aria-label="Search by image"
                className="w-7 h-7 bg-secondary/80 rounded-md flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Camera className="w-3.5 h-3.5 text-primary" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onFilterClick) {
                    onFilterClick();
                    return;
                  }
                  navigate("/search");
                }}
                aria-label="Open filters"
                className="w-7 h-7 bg-secondary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
          </div>

          {/* Location */}
          <button
            onClick={refreshLocation}
            className="hidden md:flex items-center gap-1 text-secondary/80 hover:text-secondary text-xs bg-secondary/10 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <MapPin className="w-3 h-3" />
            <span className="max-w-[80px] truncate">{city}</span>
          </button>

          {/* Right actions — Language button REMOVED */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button
              onClick={() => navigate(user ? "/profile" : "/login")}
              className="flex items-center gap-1 text-secondary/80 hover:text-secondary text-xs px-1.5 py-1.5 rounded-lg transition-colors"
              aria-label="Profile"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </button>

            <button
              onClick={() => navigate("/wishlist")}
              className="hidden sm:flex items-center gap-0.5 text-secondary/80 hover:text-secondary text-xs px-1.5 py-1.5 rounded-lg transition-colors shrink-0"
              aria-label="Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Cart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Marquee */}
      <div className="bg-secondary overflow-hidden py-1.5">
        <div className="marquee-track flex whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="mx-6 text-xs font-medium text-primary inline-block">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
