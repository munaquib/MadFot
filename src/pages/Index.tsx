import { useState, useEffect } from "react";
import { MapPin, Heart, ShieldCheck, RotateCcw, Lock, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import WhyBuyPreLoved from "@/components/WhyBuyPreLoved";
import SponsoredCarousel from "@/components/SponsoredCarousel";
import SponsoredInFeed from "@/components/SponsoredInFeed";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import heroLuxury from "@/assets/hero-luxury.jpg";
import catLehengaImg from "@/assets/cat-lehenga.jpg";
import catSherwaniImg from "@/assets/cat-sherwani.jpg";
import catSareeImg from "@/assets/cat-saree.jpg";
import catCoatpantImg from "@/assets/cat-coatpant.jpg";

const filterCategories = ["All", "Lehenga", "Sherwani", "Saree", "Coat Pant", "Kurti", "Gown", "Indo-Western"];
const filterConditions = ["All", "Like New", "Excellent", "Good", "Fair"];

const categories = [
  { img: catLehengaImg, label: "Lehenga", slug: "Lehenga" },
  { img: catSherwaniImg, label: "Sherwani", slug: "Sherwani" },
  { img: catSareeImg, label: "Saree", slug: "Saree" },
  { img: catCoatpantImg, label: "Coat Pant", slug: "Coat Pant" },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Authenticity Guaranteed" },
  { icon: RotateCcw, label: "Easy Returns" },
  { icon: Lock, label: "Secure Payments" },
];

const Index = () => {
  const navigate = useNavigate();
  const [featuredItems, setFeaturedItems] = useState<Tables<"products">[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Tables<"products">[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [maxPrice, setMaxPrice] = useState(100000);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: featured } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("views_count", { ascending: false })
        .limit(4);
      setFeaturedItems(featured || []);

      const { data: recent } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      setRecentlyAdded(recent || []);
    };
    fetchProducts();
  }, []);

  return (
    <AppLayout showHeader={true} onHeaderFilterClick={() => setShowFilters(prev => !prev)}>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 md:px-6 pt-3 overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground font-serif flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-secondary" /> Filters
                </h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Category filter */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {["All", "Lehenga", "Sherwani", "Saree", "Coat Pant", "Kurti", "Gown", "Indo-Western"].map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${selectedCategory === cat ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition filter */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Condition</p>
                <div className="flex flex-wrap gap-2">
                  {["All", "Like New", "Excellent", "Good", "Fair"].map((c) => (
                    <button key={c} onClick={() => setSelectedCondition(c)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${selectedCondition === c ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price filter */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Max Price: ₹{maxPrice.toLocaleString("en-IN")}</p>
                <input type="range" min="1000" max="200000" step="1000" value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-yellow-600" />
              </div>

              <button
                onClick={() => { navigate(`/search?category=${selectedCategory}&condition=${selectedCondition}&maxPrice=${maxPrice}`); setShowFilters(false); }}
                className="w-full py-2.5 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all">
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <div className="px-4 md:px-6 pt-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden shadow-luxury relative">
          <img src={heroLuxury} alt="MadFod - Buy & Sell Pre-Loved Luxury Fashion" className="w-full h-44 md:h-56 lg:h-72 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent flex flex-col items-start justify-center px-5 md:px-10">
            <span className="text-[10px] md:text-xs text-secondary/70 font-medium tracking-widest uppercase">Exclusive Pieces, Exceptional Prices</span>
            <h2 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-secondary font-serif leading-tight mt-1">Buy & Sell Pre-Loved<br />Luxury Fashion</h2>
            <button onClick={() => navigate("/search")} className="mt-3 bg-secondary text-primary text-xs md:text-sm font-bold px-5 py-2 rounded-lg hover:bg-secondary/90 transition-colors shadow-card">Shop Now</button>
          </div>
        </motion.div>
      </div>

      {/* Sponsored Banner Carousel */}
      <SponsoredCarousel />

      {/* Trust Badges */}
      <div className="px-4 md:px-6 mt-4">
        <div className="flex items-center justify-around glass-card rounded-2xl py-3 px-2 shadow-card border border-border/30">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5">
              <badge.icon className="w-4 h-4 text-secondary" />
              <span className="text-[9px] md:text-[10px] font-semibold text-foreground">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 md:px-6 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-foreground font-serif">✦ Categories</h2>
          <span onClick={() => navigate("/search")} className="text-xs text-secondary font-medium cursor-pointer hover:underline">See all →</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {categories.map((cat, i) => (
            <motion.div key={cat.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/search?category=${encodeURIComponent(cat.slug)}`)}
              className="relative rounded-2xl overflow-hidden shadow-card cursor-pointer group hover:shadow-luxury hover:-translate-y-1 transition-all duration-300 border border-border/30"
            >
              <img src={cat.img} alt={cat.label} loading="lazy" className="w-full h-40 md:h-48 lg:h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                <p className="text-sm md:text-base font-bold text-secondary font-serif">{cat.label}</p>
                <button className="mt-1.5 bg-secondary text-primary text-[10px] md:text-xs font-bold px-3 py-1 rounded-md hover:bg-secondary/90 transition-colors">Shop Now</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured Items - from DB */}
      <div className="px-4 md:px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-foreground font-serif">✦ Featured Deals</h2>
          <span onClick={() => navigate("/search")} className="text-xs text-secondary font-medium cursor-pointer hover:underline">See all →</span>
        </div>
        {featuredItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No products listed yet. Be the first to sell!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {featuredItems.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="glass-card rounded-2xl overflow-hidden shadow-card border border-border/30 cursor-pointer hover:shadow-luxury hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img src={item.images?.[0] || "/placeholder.svg"} alt={item.title} loading="lazy" className="w-full h-36 md:h-48 lg:h-56 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button className="absolute top-2 right-2 w-7 h-7 md:w-8 md:h-8 glass-card rounded-full flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-primary/90 text-secondary text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full">{item.condition}</span>
                  <span className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
                <div className="p-2.5 md:p-3">
                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm md:text-base font-extrabold text-secondary">₹{item.price.toLocaleString()}</p>
                    {item.original_price && <p className="text-[10px] md:text-xs text-muted-foreground line-through">₹{item.original_price.toLocaleString()}</p>}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="text-[10px] md:text-xs">{item.location}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Sponsored In-Feed */}
      <SponsoredInFeed />

      {/* Recently Added - from DB */}
      <div className="px-4 md:px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base md:text-lg font-bold text-foreground font-serif">✦ Recently Added</h2>
          <span onClick={() => navigate("/search")} className="text-xs text-secondary font-medium cursor-pointer hover:underline">See all →</span>
        </div>
        {recentlyAdded.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent products yet.</p>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {recentlyAdded.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="glass-card rounded-2xl p-3 shadow-card flex items-center gap-3 border border-border/30 cursor-pointer hover:shadow-luxury hover:scale-[1.01] transition-all duration-300"
              >
                <img src={item.images?.[0] || "/placeholder.svg"} alt={item.title} loading="lazy" className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs md:text-sm font-bold text-secondary mt-0.5">₹{item.price.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="text-[10px] md:text-xs">{item.location}</span>
                  </div>
                </div>
                <Heart className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="px-4 md:px-6 mt-8 mb-4">
        <div className="glass-card rounded-2xl border border-border/30 shadow-card overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-5 py-4">
            <h2 className="text-secondary font-bold text-lg font-serif">About MadFod</h2>
            <p className="text-secondary/60 text-xs mt-0.5">India ka Premium Pre-Loved Fashion Marketplace</p>
          </div>
          {/* Content */}
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">MadFod</span> ek trusted platform hai jahan aap apne pre-loved ethnic aur luxury fashion — lehenga, sherwani, saree, gown aur bahut kuch — buy aur sell kar sakte hain. Hum believe karte hain ki premium fashion sabke liye accessible hona chahiye.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🛍️", title: "Buy Smart", desc: "Up to 80% off on branded ethnic wear" },
                { emoji: "💰", title: "Sell Easy", desc: "List in 2 mins, earn from old clothes" },
                { emoji: "✅", title: "100% Verified", desc: "Every seller & product is verified" },
                { emoji: "🔒", title: "Safe & Secure", desc: "Secure payments via Razorpay" },
              ].map((item) => (
                <div key={item.title} className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-xl">{item.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/30 pt-3 flex items-center justify-between">
              <div className="text-center">
                <p className="text-lg font-extrabold text-secondary">500+</p>
                <p className="text-[10px] text-muted-foreground">Products Listed</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-secondary">100%</p>
                <p className="text-[10px] text-muted-foreground">Authentic</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-secondary">4.8★</p>
                <p className="text-[10px] text-muted-foreground">User Rating</p>
              </div>
            </div>
            {/* Footer links */}
            <div className="border-t border-border/30 pt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <span className="cursor-pointer hover:text-secondary transition-colors">📋 About Us</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">🤝 Sell With Us</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">🔒 Privacy Policy</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">📞 Contact Us</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">↩️ Returns Policy</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">💳 Payment Info</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">❓ Help & FAQ</span>
              <span className="cursor-pointer hover:text-secondary transition-colors">📱 Download App</span>
            </div>
            <p className="text-center text-[10px] text-muted-foreground pt-1">© 2026 MadFod. All rights reserved. Made with ❤️ in India</p>
          </div>
        </div>
      </div>

      <WhyBuyPreLoved />
    </AppLayout>
  );
};

export default Index;
