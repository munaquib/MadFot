import { useState, useEffect } from "react";
import { Megaphone, Eye, MousePointer, TrendingUp, ArrowLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface Ad {
  id: string;
  ad_title: string;
  image_url: string | null;
  placement: string;
  duration_days: number;
  budget: number;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface AdWithAnalytics extends Ad {
  views: number;
  clicks: number;
  ctr: number;
}

const MyAds = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ads, setAds] = useState<AdWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAds = async () => {
      const { data: adsData } = await supabase
        .from("ads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!adsData) { setLoading(false); return; }

      const adsWithAnalytics: AdWithAnalytics[] = await Promise.all(
        (adsData as Ad[]).map(async (ad) => {
          const { count: views } = await supabase.from("ad_analytics").select("id", { count: "exact", head: true }).eq("ad_id", ad.id).eq("event_type", "view");
          const { count: clicks } = await supabase.from("ad_analytics").select("id", { count: "exact", head: true }).eq("ad_id", ad.id).eq("event_type", "click");
          const v = views || 0;
          const c = clicks || 0;
          return { ...ad, views: v, clicks: c, ctr: v > 0 ? Math.round((c / v) * 10000) / 100 : 0 };
        })
      );

      setAds(adsWithAnalytics);
      setLoading(false);
    };
    fetchAds();
  }, [user]);

  const totalViews = ads.reduce((s, a) => s + a.views, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const avgCtr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 10000) / 100 : 0;

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 pt-5 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
          <h1 className="text-secondary font-bold text-lg font-serif flex items-center gap-2"><Megaphone className="w-5 h-5" /> My Ads</h1>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Eye, label: "Views", value: totalViews.toLocaleString() },
            { icon: MousePointer, label: "Clicks", value: totalClicks.toLocaleString() },
            { icon: TrendingUp, label: "CTR", value: `${avgCtr}%` },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-3 text-center border border-secondary/20">
              <s.icon className="w-4 h-4 text-secondary mx-auto mb-1" />
              <p className="text-lg font-bold text-secondary">{s.value}</p>
              <p className="text-[10px] text-secondary/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : ads.length === 0 ? (
          <div className="text-center py-10">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No ads yet</p>
            <p className="text-xs text-muted-foreground mt-1">Promote your products to reach more buyers!</p>
            <button onClick={() => navigate("/profile")} className="mt-4 px-6 py-2 bg-primary text-secondary rounded-xl font-semibold text-sm">Go to Listings</button>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad, i) => (
              <motion.div key={ad.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-3 shadow-card border border-border/30"
              >
                <div className="flex gap-3">
                  {ad.image_url && <img src={ad.image_url} alt={ad.ad_title} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{ad.ad_title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        ad.status === "active" ? "bg-primary/10 text-primary" :
                        ad.status === "pending" ? "bg-secondary/10 text-secondary" :
                        ad.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>{ad.status}</span>
                      <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ad.placement}</span>
                    </div>
                    <p className="text-xs font-bold text-secondary mt-1">₹{ad.budget}</p>
                  </div>
                </div>

                {/* Analytics */}
                <div className="grid grid-cols-3 gap-2 mt-3 bg-muted/30 rounded-xl p-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">{ad.views}</p>
                    <p className="text-[9px] text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">{ad.clicks}</p>
                    <p className="text-[9px] text-muted-foreground">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">{ad.ctr}%</p>
                    <p className="text-[9px] text-muted-foreground">CTR</p>
                  </div>
                </div>

                {ad.expires_at && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(ad.expires_at) > new Date() ? `Expires: ${new Date(ad.expires_at).toLocaleDateString()}` : "Expired"}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MyAds;
