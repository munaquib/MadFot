import { useState, useEffect } from "react";
import { Search, MapPin, User, ShoppingCart, Crown, Menu, SlidersHorizontal, Heart, Bell, ChevronLeft } from "lucide-react";
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

// State → Cities mapping
const stateCities: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Korba", "Bilaspur", "Durg", "Rajnandgaon"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Lajpat Nagar", "Karol Bagh", "Saket", "Janakpuri"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Anand"],
  "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu", "Manali"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Sopore"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Kalaburagi", "Davangere", "Ballari"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha"],
  "Ladakh": ["Leh", "Kargil"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Kolhapur"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara", "Alwar"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Allahabad", "Ghaziabad", "Noida", "Mathura", "Moradabad", "Aligarh", "Bareilly"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Rishikesh", "Nainital"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman", "Malda"],
  "Andaman & Nicobar Islands": ["Port Blair"],
  "Dadra & Nagar Haveli": ["Silvassa"],
  "Daman & Diu": ["Daman", "Diu"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal", "Yanam"],
};

const indianStates = ["All in India", ...Object.keys(stateCities).sort()];

const TopHeader = ({ sidebarOpen, onToggleSidebar, onFilterClick }: TopHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [city, setCity] = useState(() => {
    try { return localStorage.getItem("madfod_city") || "Detecting..."; } catch { return "Detecting..."; }
  });
  const [state, setState] = useState(() => {
    try { return localStorage.getItem("madfod_state") || ""; } catch { return ""; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [drawerStep, setDrawerStep] = useState<"state" | "city">("state");
  const [selectedState, setSelectedState] = useState("");
  const [recentlyUsed, setRecentlyUsed] = useState<string>(() => {
    try { return localStorage.getItem("madfod_recent_location") || ""; } catch { return ""; }
  });

  const detectCity = async (pos: GeolocationPosition) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
      );
      const data = await res.json();
      const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || "Unknown";
      const stateName = data.address?.state || "";
      setCity(cityName);
      setState(stateName);
      const fullLocation = stateName ? `${cityName}, ${stateName}` : cityName;
      try {
        localStorage.setItem("madfod_city", cityName);
        localStorage.setItem("madfod_state", stateName);
        localStorage.setItem("madfod_recent_location", fullLocation);
        setRecentlyUsed(fullLocation);
      } catch {}
    } catch {
      setCity("Meerut");
      setState("Uttar Pradesh");
      try {
        localStorage.setItem("madfod_city", "Meerut");
        localStorage.setItem("madfod_state", "Uttar Pradesh");
        localStorage.setItem("madfod_recent_location", "Meerut, Uttar Pradesh");
        setRecentlyUsed("Meerut, Uttar Pradesh");
      } catch {}
    }
  };

  useEffect(() => {
    const savedCity = localStorage.getItem("madfod_city");
    if (!savedCity) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => detectCity(pos),
          () => { setCity("Meerut"); setState("Uttar Pradesh"); }
        );
      } else {
        setCity("Meerut");
        setState("Uttar Pradesh");
      }
    }
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const refreshLocation = () => {
    setCity("Detecting...");
    setState("");
    navigator.geolocation?.getCurrentPosition(
      (pos) => detectCity(pos),
      () => { setCity("Meerut"); setState("Uttar Pradesh"); }
    );
  };

  // Display location — city + state, no duplicates
  const displayLocation = () => {
    if (!city || city === "Detecting...") return state || "India";
    if (city === state) return state || "India";
    if (city === "All India") return "All India";
    if (!state) return city;
    return `${city}, ${state}`;
  };

  // Open drawer
  const openDrawer = () => {
    setDrawerStep("state");
    setSelectedState("");
    setLocationSearch("");
    setShowLocationDrawer(true);
  };

  // State selected → go to city step
  const handleStateSelect = (s: string) => {
    if (s === "All in India") {
      setCity("All India");
      setState("");
      try {
        localStorage.setItem("madfod_city", "All India");
        localStorage.setItem("madfod_state", "");
      } catch {}
      setShowLocationDrawer(false);
      setLocationSearch("");
      return;
    }
    setSelectedState(s);
    setDrawerStep("city");
    setLocationSearch("");
  };

  // City selected → save and close
  const handleCitySelect = (c: string) => {
    setCity(c);
    setState(selectedState);
    const full = `${c}, ${selectedState}`;
    try {
      localStorage.setItem("madfod_city", c);
      localStorage.setItem("madfod_state", selectedState);
      localStorage.setItem("madfod_recent_location", full);
      setRecentlyUsed(full);
    } catch {}
    setShowLocationDrawer(false);
    setLocationSearch("");
    setDrawerStep("state");
    setSelectedState("");
  };

  return (
    <div className="w-full sticky top-0 z-50">
      {/* ========== MOBILE HEADER ========== */}
      <div className="lg:hidden bg-primary px-4 pt-2.5 pb-0">
        {/* Row 1: Logo + Location */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-extrabold text-secondary font-serif">MadFod</h1>
          </div>
          <button onClick={openDrawer} className="flex items-center gap-1 text-secondary/80 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span className="max-w-[160px] truncate text-xs">{displayLocation()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>

        {/* Row 2: Search bar + Heart + Bell */}
        <div className="flex items-center gap-2 pb-2.5">
          <div className="flex flex-1 rounded-lg overflow-hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search..."
                className="w-full bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFilterClick) { onFilterClick(); return; } navigate("/search"); }}
              className="flex items-center gap-1.5 bg-secondary text-primary text-[11px] font-bold px-3 py-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
          <button onClick={() => navigate("/wishlist")} className="w-9 h-9 bg-secondary/20 rounded-lg flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 text-secondary" />
          </button>
          <button onClick={() => navigate("/notifications")} className="w-9 h-9 bg-secondary/20 rounded-lg flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-secondary" />
          </button>
        </div>
      </div>

      {/* ========== LOCATION DRAWER ========== */}
      {showLocationDrawer && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/50" onClick={() => setShowLocationDrawer(false)}>
          <div className="absolute inset-0 bg-card overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/30">
              <div className="flex items-center gap-2">
                {drawerStep === "city" && (
                  <button onClick={() => { setDrawerStep("state"); setLocationSearch(""); }} className="mr-1">
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                )}
                <span className="text-base font-bold text-foreground">
                  {drawerStep === "state" ? "Select Location" : `Cities in ${selectedState}`}
                </span>
              </div>
              <button onClick={() => { setShowLocationDrawer(false); setDrawerStep("state"); setLocationSearch(""); }} className="text-muted-foreground text-lg font-bold">✕</button>
            </div>

            <div className="px-4 pt-3 pb-2">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5 mb-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder={drawerStep === "state" ? "Search state..." : "Search city..."}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* STATE STEP */}
              {drawerStep === "state" && (
                <>
                  {/* Use current location */}
                  <div className="flex items-center gap-3 text-primary py-2 cursor-pointer border-b border-border/20 mb-2"
                    onClick={() => { refreshLocation(); setShowLocationDrawer(false); setLocationSearch(""); setDrawerStep("state"); }}>
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-primary">Use current location</p>
                      <p className="text-xs text-muted-foreground">Enable Location</p>
                    </div>
                  </div>

                  {/* Recently Used */}
                  {recentlyUsed && !locationSearch && (
                    <div className="border-b border-border/30 mb-2 pb-2">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">RECENTLY USED</p>
                      <button onClick={() => {
                        const parts = recentlyUsed.split(", ");
                        setCity(parts[0]); setState(parts[1] || "");
                        try { localStorage.setItem("madfod_city", parts[0]); localStorage.setItem("madfod_state", parts[1] || ""); } catch {}
                        setShowLocationDrawer(false); setLocationSearch("");
                      }} className="flex items-center gap-3 w-full py-2.5">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{recentlyUsed}</span>
                      </button>
                    </div>
                  )}

                  {/* States list */}
                  <p className="text-xs text-muted-foreground font-semibold mb-2">CHOOSE STATE</p>
                  {indianStates
                    .filter(s => !locationSearch || s.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((s) => (
                      <button key={s} onClick={() => handleStateSelect(s)}
                        className="flex items-center justify-between w-full py-3 border-b border-border/20 text-sm text-foreground hover:text-primary transition-colors">
                        <span className={s === "All in India" ? "text-primary font-semibold" : ""}>{s}</span>
                        {s !== "All in India" && <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>}
                      </button>
                    ))}
                </>
              )}

              {/* CITY STEP */}
              {drawerStep === "city" && (
                <>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">CHOOSE CITY</p>
                  {(stateCities[selectedState] || [])
                    .filter(c => !locationSearch || c.toLowerCase().includes(locationSearch.toLowerCase()))
                    .map((c) => (
                      <button key={c} onClick={() => handleCitySelect(c)}
                        className="flex items-center justify-between w-full py-3 border-b border-border/20 text-sm text-foreground hover:text-primary transition-colors">
                        <span>{c}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== DESKTOP LOCATION DROPDOWN ========== */}
      {showLocationDrawer && (
        <div className="hidden lg:block fixed inset-0 z-[100]" onClick={() => { setShowLocationDrawer(false); setDrawerStep("state"); setLocationSearch(""); }}>
          <div className="absolute bg-card rounded-2xl shadow-2xl border border-border/30 overflow-hidden w-[380px]"
            style={{ top: "52px", right: "120px" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                {drawerStep === "city" && (
                  <button onClick={() => { setDrawerStep("state"); setLocationSearch(""); }}>
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                )}
                <span className="text-sm font-bold text-foreground">
                  {drawerStep === "state" ? "Select Location" : `Cities in ${selectedState}`}
                </span>
              </div>
              <button onClick={() => { setShowLocationDrawer(false); setDrawerStep("state"); setLocationSearch(""); }} className="text-muted-foreground font-bold text-lg">✕</button>
            </div>
            <div className="px-4 pt-3 pb-2 max-h-[420px] overflow-y-auto">
              {/* Search */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 mb-3">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input type="text" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder={drawerStep === "state" ? "Search state..." : "Search city..."}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              </div>
              {/* STATE STEP */}
              {drawerStep === "state" && (
                <>
                  <div className="flex items-center gap-3 py-2 cursor-pointer border-b border-border/20 mb-2"
                    onClick={() => { refreshLocation(); setShowLocationDrawer(false); setLocationSearch(""); setDrawerStep("state"); }}>
                    <MapPin className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-bold text-primary">Use current location</p>
                      <p className="text-xs text-muted-foreground">Enable Location</p>
                    </div>
                  </div>
                  {recentlyUsed && !locationSearch && (
                    <div className="border-b border-border/30 mb-2 pb-2">
                      <p className="text-xs text-muted-foreground font-semibold mb-1">RECENTLY USED</p>
                      <button onClick={() => {
                        const parts = recentlyUsed.split(", ");
                        setCity(parts[0]); setState(parts[1] || "");
                        try { localStorage.setItem("madfod_city", parts[0]); localStorage.setItem("madfod_state", parts[1] || ""); } catch {}
                        setShowLocationDrawer(false); setLocationSearch("");
                      }} className="flex items-center gap-3 w-full py-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{recentlyUsed}</span>
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground font-semibold mb-1">CHOOSE STATE</p>
                  {indianStates.filter(s => !locationSearch || s.toLowerCase().includes(locationSearch.toLowerCase())).map((s) => (
                    <button key={s} onClick={() => handleStateSelect(s)}
                      className="flex items-center justify-between w-full py-2.5 border-b border-border/20 text-sm text-foreground hover:text-primary transition-colors">
                      <span className={s === "All in India" ? "text-primary font-semibold" : ""}>{s}</span>
                      {s !== "All in India" && <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>}
                    </button>
                  ))}
                </>
              )}
              {/* CITY STEP */}
              {drawerStep === "city" && (
                <>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">CHOOSE CITY</p>
                  {(stateCities[selectedState] || []).filter(c => !locationSearch || c.toLowerCase().includes(locationSearch.toLowerCase())).map((c) => (
                    <button key={c} onClick={() => handleCitySelect(c)}
                      className="flex items-center justify-between w-full py-2.5 border-b border-border/20 text-sm text-foreground hover:text-primary transition-colors">
                      <span>{c}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== DESKTOP HEADER ========== */}
      <div className="hidden lg:block bg-primary px-4 py-2.5">
        <div className="max-w-[1300px] mx-auto flex items-center gap-3">
          {!sidebarOpen && (
            <button onClick={onToggleSidebar} className="flex items-center justify-center w-8 h-8 text-secondary/80 hover:text-secondary transition-colors shrink-0">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className={`flex items-center gap-2 cursor-pointer shrink-0 ${sidebarOpen ? "lg:hidden" : ""}`} onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-extrabold text-secondary font-serif block">MadFod</h1>
          </div>
          <div className="flex flex-1 mx-auto rounded-lg overflow-hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search..."
                className="w-full bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onFilterClick) { onFilterClick(); return; } navigate("/search"); }}
              className="flex items-center gap-1.5 bg-secondary text-primary text-[11px] font-bold px-3 py-2 hover:opacity-90 transition-opacity shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
          <button onClick={openDrawer} className="flex items-center gap-1.5 text-secondary/80 hover:text-secondary text-xs bg-secondary/10 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            <MapPin className="w-3.5 h-3.5" />
            <span className="max-w-[160px] truncate">{displayLocation()}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button onClick={() => navigate(user ? "/profile" : "/login")} className="flex items-center gap-1 text-secondary/80 hover:text-secondary text-xs px-1.5 py-1.5 rounded-lg transition-colors">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </button>
            <button onClick={() => navigate("/wishlist")} className="hidden sm:flex items-center gap-0.5 text-secondary/80 hover:text-secondary text-xs px-1.5 py-1.5 rounded-lg transition-colors shrink-0">
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
