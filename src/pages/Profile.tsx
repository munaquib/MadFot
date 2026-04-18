import { useState, useEffect } from "react";
import { Settings, Shield, LogOut, ChevronRight, Package, Heart, Star, HelpCircle, Trash2, Megaphone, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import PromoteModal from "@/components/PromoteModal";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

const menuItems = [
  { icon: Package, label: "My Orders", badge: "2", path: "/my-orders" },
  { icon: Heart, label: "Saved Items", path: "/wishlist" },
  { icon: Megaphone, label: "My Ads", path: "/my-ads" },
  { icon: Star, label: "My Reviews", path: "/my-reviews" },
  { icon: Shield, label: "Verify Account", path: "/verify-account" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
];

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [myListings, setMyListings] = useState<Tables<"products">[]>([]);
  const [promoteProduct, setPromoteProduct] = useState<Tables<"products"> | null>(null);
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      setProfile(prof);
      const { data: listings } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setMyListings(listings || []);
    };
    fetchData();
  }, [user]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const activeCount = myListings.filter((p) => p.status === "active").length;
  const soldCount = myListings.filter((p) => p.status === "sold").length;

  const handleDeleteListing = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) { toast.error("Failed to delete"); return; }
    setMyListings((prev) => prev.filter((p) => p.id !== productId));
    toast.success("Listing deleted! 🗑️");
  };

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 pt-6 pb-12 rounded-b-[2rem] lg:rounded-b-3xl relative">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-secondary font-bold text-lg md:text-xl font-serif">My Profile</h1>
          <button onClick={() => navigate("/settings")}><Settings className="w-5 h-5 text-secondary/70" /></button>
        </div>
        <div className="flex flex-col items-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-card border-4 border-secondary/20" />
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full gradient-card-shine flex items-center justify-center text-secondary-foreground text-2xl md:text-3xl font-bold shadow-card border-4 border-secondary/20">{initials}</div>
          )}
          <h2 className="text-secondary font-bold text-lg md:text-xl mt-2 font-serif">{displayName}</h2>
          <p className="text-secondary/60 text-xs md:text-sm flex items-center gap-1">{(profile as any)?.is_verified ? (<><BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400 font-semibold">Verified Seller</span></>) : (<><Shield className="w-3 h-3" /> Seller</>)}</p>
          <div className="flex gap-6 mt-3">
            {[{ val: String(myListings.length), label: "Listings" }, { val: String(soldCount), label: "Sold" }, { val: profile?.avg_rating && Number(profile.avg_rating) > 0 ? Number(profile.avg_rating).toFixed(1) : "—", label: "Rating" }].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-secondary font-bold text-lg">{s.val}</p>
                <p className="text-secondary/50 text-[10px] md:text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 -mt-5 space-y-4 max-w-3xl mx-auto lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:max-w-4xl">
        <div className="glass-card rounded-2xl p-3 md:p-4 shadow-card border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm md:text-base font-bold text-foreground font-serif">My Listings</h3>
            <span onClick={() => navigate("/sell")} className="text-xs text-secondary font-medium cursor-pointer hover:underline">+ Add New</span>
          </div>
          {myListings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No listings yet. Start selling!</p>
          ) : (
            <div className="space-y-2">
              {myListings.slice(0, 5).map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  onClick={() => navigate(`/product/${item.id}`)}
                  className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <img src={item.images?.[0] || "/placeholder.svg"} alt={item.title} loading="lazy" className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs font-bold text-secondary">₹{item.price.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{item.views_count || 0} views</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
                  <button onClick={(e) => { e.stopPropagation(); setPromoteProduct(item); }} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary/10 transition-colors" title="Promote">
                    <Megaphone className="w-3.5 h-3.5 text-secondary" />
                  </button>
                  <button onClick={(e) => handleDeleteListing(e, item.id)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors" title="Delete listing">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="glass-card rounded-2xl shadow-card border border-border/30 overflow-hidden">
            {menuItems.map((item) => (
              <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-all duration-200 border-b border-border/20 last:border-b-0">
                <item.icon className="w-5 h-5 text-secondary" />
                <span className="flex-1 text-sm font-medium text-foreground text-left">{item.label}</span>
                {item.badge && <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <button onClick={() => signOut()} className="w-full py-3 glass-card border border-destructive/30 text-destructive rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-4 hover:bg-destructive/5 transition-all duration-200">
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      {/* Promote Modal */}
      {promoteProduct && (
        <PromoteModal
          open={!!promoteProduct}
          onOpenChange={(open) => { if (!open) setPromoteProduct(null); }}
          product={promoteProduct}
        />
      )}
    </AppLayout>
  );
};

export default Profile;
