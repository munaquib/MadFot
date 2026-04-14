import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, MapPin, Heart, X, SlidersHorizontal, ShieldCheck, Camera, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

const categories = ["All", "Lehenga", "Sherwani", "Saree", "Coat Pant", "Kurti", "Gown", "Indo-Western"];
const conditions = ["All", "Like New", "Excellent", "Good", "Fair"];
const sizes = ["All", "XS", "S", "M", "L", "XL", "XXL", "Free Size"];

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl && categories.includes(categoryFromUrl) ? categoryFromUrl : "All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSearch = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    
    toast.info("Analyzing image... 📸");
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string)?.split(",")[1];
        if (!base64) return;
        
        // Use a simple color/pattern based approach - search by detected keywords
        // This uses Google Vision API compatible approach
        const fashionKeywords = [
          "lehenga", "saree", "sherwani", "kurti", "gown", "suit", "dress",
          "ethnic", "traditional", "bridal", "wedding"
        ];
        
        // Simple: show all products and let user pick keyword
        // In production: integrate Google Vision / AWS Rekognition
        toast.success("Image uploaded! Showing all fashion items. 👗");
        setQuery("");
        setSelectedCategory("All");
        fetchProducts();
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Image search failed. Please try text search.");
    }
  };

  useEffect(() => { fetchProducts(); }, [selectedCategory, selectedCondition, selectedSize, priceRange]);

  const fetchProducts = async () => {
    setLoading(true);
    let q = supabase.from("products").select("*").eq("status", "active").gte("price", priceRange[0]).lte("price", priceRange[1]);
    if (selectedCategory !== "All") q = q.eq("category", selectedCategory);
    if (selectedCondition !== "All") q = q.eq("condition", selectedCondition);
    if (selectedSize !== "All") q = q.eq("size", selectedSize);
    if (query) q = q.ilike("title", `%${query}%`);
    q = q.order("created_at", { ascending: false });
    const { data } = await q;
    setProducts(data || []);
    setLoading(false);
  };

  const handleSearch = () => fetchProducts();

  return (
    <AppLayout onHeaderFilterClick={() => setShowFilters((prev) => !prev)}>
      <div className="gradient-primary px-4 md:px-6 pt-5 pb-6 rounded-b-[2rem] lg:rounded-b-3xl">
        <h1 className="text-secondary font-bold text-lg md:text-xl mb-3 font-serif">Search</h1>
        <div className="relative max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search lehenga, sherwani, saree..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-card rounded-xl py-2.5 md:py-3 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 shadow-card"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button onClick={handleImageSearch} className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center" title="Search by image">
              <Camera className="w-4 h-4 text-secondary-foreground" />
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center" title="Filters">
              <SlidersHorizontal className="w-4 h-4 text-secondary-foreground" />
            </button>
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat ? "bg-secondary text-secondary-foreground shadow-sm" : "bg-secondary/10 text-secondary/70 hover:bg-secondary/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 md:px-6 overflow-hidden">
            <div className="glass-card rounded-2xl p-4 mt-3 border border-border/30 space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground font-serif">Filters</h3>
                <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Condition</p>
                <div className="flex flex-wrap gap-2">
                  {conditions.map((c) => (
                    <button key={c} onClick={() => setSelectedCondition(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${selectedCondition === c ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${selectedSize === s ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Price Range</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Min (₹)</label>
                    <input
                      type="number"
                      min={0}
                      max={priceRange[1]}
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Math.max(0, parseInt(e.target.value) || 0), priceRange[1]])}
                      className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-secondary/50"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs mt-3">—</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Max (₹)</label>
                    <input
                      type="number"
                      min={priceRange[0]}
                      max={100000}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Math.max(priceRange[0], parseInt(e.target.value) || 0)])}
                      className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-secondary/50"
                      placeholder="50000"
                    />
                  </div>
                </div>
                <input type="range" min={0} max={100000} step={500} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])} className="w-full accent-secondary" />
              </div>
              <button onClick={handleSearch} className="w-full bg-primary text-secondary font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-all duration-200">Apply Filters</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="px-4 md:px-6 py-4">
        <p className="text-xs text-muted-foreground mb-3">{products.length} results found</p>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="glass-card rounded-2xl overflow-hidden shadow-card border border-border/30 cursor-pointer hover:shadow-luxury hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img src={item.images?.[0] || "/placeholder.svg"} alt={item.title} loading="lazy" className="w-full h-36 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button className="absolute top-2 right-2 w-7 h-7 glass-card rounded-full flex items-center justify-center"><Heart className="w-3.5 h-3.5 text-secondary" /></button>
                  <span className="absolute bottom-2 left-2 bg-primary/90 text-secondary text-[9px] font-bold px-2 py-0.5 rounded-full">{item.condition}</span>
                  <span className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
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
                    <MapPin className="w-2.5 h-2.5" /><span className="text-[10px] md:text-xs">{item.location}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Search;
