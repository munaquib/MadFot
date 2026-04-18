import { useState, useEffect } from "react";
import { Megaphone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface InFeedAd {
  id: string;
  ad_title: string;
  description: string | null;
  image_url: string | null;
  product_id: string;
  products: {
    title: string;
    price: number;
    location: string | null;
    condition: string | null;
    images: string[] | null;
  } | null;
}

const SponsoredInFeed = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<InFeedAd[]>([]);

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from("ads")
        .select("id, ad_title, description, image_url, product_id, products(title, price, location, condition, images)")
        .eq("status", "active")
        .eq("placement", "in-feed")
        .order("budget", { ascending: false })
        .limit(4);
      setAds((data as any) || []);
    };
    fetchAds();
  }, []);

  const handleClick = (ad: InFeedAd) => {
    supabase.from("ad_analytics").insert({ ad_id: ad.id, event_type: "click" }).then();
    supabase.from("ad_analytics").insert({ ad_id: ad.id, event_type: "view" }).then();
    navigate(`/product/${ad.product_id}`);
  };

  if (ads.length === 0) return null;

  return (
    <div className="px-4 md:px-6 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base md:text-lg font-bold text-foreground font-serif flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-secondary" /> Sponsored
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {ads.map((ad, i) => {
          const product = ad.products;
          const img = ad.image_url || product?.images?.[0] || "/placeholder.svg";
          return (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleClick(ad)}
              className="glass-card rounded-2xl overflow-hidden shadow-card border border-secondary/20 cursor-pointer hover:shadow-luxury hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="relative overflow-hidden">
                <img src={img} alt={ad.ad_title} loading="lazy" className="w-full h-36 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Megaphone className="w-2.5 h-2.5" /> Sponsored
                </span>
              </div>
              <div className="p-2.5 md:p-3">
                <p className="text-xs md:text-sm font-semibold text-foreground truncate">{ad.ad_title}</p>
                <p className="text-sm md:text-base font-extrabold text-secondary mt-0.5">₹{product?.price?.toLocaleString() || "—"}</p>
                {product?.location && (
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" />
                    <span className="text-[10px] md:text-xs">{product.location}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SponsoredInFeed;
