import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  ad_title: string;
  description: string | null;
  image_url: string | null;
  product_id: string;
  budget: number;
}

const SponsoredCarousel = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from("ads")
        .select("id, ad_title, description, image_url, product_id, budget")
        .eq("status", "active")
        .eq("placement", "top-banner")
        .order("budget", { ascending: false })
        .limit(10);
      setAds(data || []);
    };
    fetchAds();
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ads.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [ads.length]);

  const handleClick = async (ad: Ad) => {
    // Record click analytics
    supabase.from("ad_analytics").insert({ ad_id: ad.id, event_type: "click" }).then();
    navigate(`/product/${ad.product_id}`);
  };

  const recordView = useCallback(async (adId: string) => {
    await supabase.from("ad_analytics").insert({ ad_id: adId, event_type: "view" });
  }, []);

  useEffect(() => {
    if (ads[current]) recordView(ads[current].id);
  }, [current, ads, recordView]);

  if (ads.length === 0) return null;

  const goToPrev = () => setCurrent((prev) => (prev - 1 + ads.length) % ads.length);
  const goToNext = () => setCurrent((prev) => (prev + 1) % ads.length);

  return (
    <div className="px-4 md:px-6 mt-4">
      <div className="relative rounded-2xl overflow-hidden shadow-luxury">
        <AnimatePresence mode="wait">
          <motion.div
            key={ads[current].id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            onClick={() => handleClick(ads[current])}
            className="cursor-pointer relative"
          >
            <img
              src={ads[current].image_url || "/placeholder.svg"}
              alt={ads[current].ad_title}
              className="w-full h-36 md:h-48 lg:h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="inline-flex items-center gap-1 bg-secondary/90 text-secondary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full mb-1.5">
                <Megaphone className="w-2.5 h-2.5" /> Sponsored
              </span>
              <h3 className="text-base md:text-lg font-bold text-secondary font-serif">{ads[current].ad_title}</h3>
              {ads[current].description && (
                <p className="text-[10px] md:text-xs text-secondary/70 mt-0.5 line-clamp-1">{ads[current].description}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {ads.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 glass-card rounded-full flex items-center justify-center z-10">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 glass-card rounded-full flex items-center justify-center z-10">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
            <div className="absolute bottom-2 right-3 flex gap-1">
              {ads.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-secondary scale-125" : "bg-secondary/30"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SponsoredCarousel;
