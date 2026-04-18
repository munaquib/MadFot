import { useState, useEffect } from "react";
import { Heart, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    title: string;
    price: number;
    original_price: number | null;
    location: string | null;
    condition: string | null;
    images: string[] | null;
  };
}

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchWishlist = async () => {
      const { data } = await supabase
        .from("wishlist")
        .select("id, product_id, products(id, title, price, original_price, location, condition, images)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as unknown as WishlistItem[]) || []);
      setLoading(false);
    };
    fetchWishlist();
  }, [user]);

  const removeFromWishlist = async (wishlistId: string) => {
    await supabase.from("wishlist").delete().eq("id", wishlistId);
    setItems((prev) => prev.filter((i) => i.id !== wishlistId));
    toast.success("Removed from wishlist");
  };

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 py-5 rounded-b-[2rem] lg:rounded-b-3xl">
        <h1 className="text-secondary font-bold text-lg md:text-xl font-serif">My Wishlist</h1>
        <p className="text-secondary/60 text-xs md:text-sm">{items.length} saved items</p>
      </div>

      <div className="px-4 md:px-6 py-4">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-10">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">Your wishlist is empty. Start exploring!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/product/${item.product_id}`)}
                className="glass-card rounded-2xl overflow-hidden shadow-card border border-border/30 cursor-pointer hover:shadow-luxury hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img src={item.products?.images?.[0] || "/placeholder.svg"} alt={item.products?.title} loading="lazy" className="w-full h-36 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromWishlist(item.id); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-primary/90 text-secondary text-[9px] font-bold px-2 py-0.5 rounded-full">{item.products?.condition}</span>
                  <span className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
                <div className="p-2.5 md:p-3">
                  <p className="text-xs md:text-sm font-semibold text-foreground truncate">{item.products?.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm md:text-base font-extrabold text-secondary">₹{item.products?.price?.toLocaleString()}</p>
                    {item.products?.original_price && <p className="text-[10px] md:text-xs text-muted-foreground line-through">₹{item.products.original_price.toLocaleString()}</p>}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <MapPin className="w-2.5 h-2.5" /><span className="text-[10px] md:text-xs">{item.products?.location}</span>
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

export default Wishlist;
