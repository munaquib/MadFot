import { useState, useEffect } from "react";
import { ShieldCheck, Check, X, Megaphone, Eye, MousePointer, TrendingUp, IndianRupee, Trash2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

interface Ad {
  id: string;
  ad_title: string;
  description: string | null;
  image_url: string | null;
  placement: string;
  duration_days: number;
  budget: number;
  status: string;
  payment_status: string;
  created_at: string;
  user_id: string;
  product_id: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Ad[]>([]);
  const [tab, setTab] = useState<"pending" | "active" | "expired" | "all">("pending");
  const [stats, setStats] = useState({ totalRevenue: 0, activeAds: 0, totalViews: 0, totalClicks: 0 });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (data) {
        await fetchAds();
        await fetchStats();
      }
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const fetchAds = async () => {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) || []);
  };

  const fetchStats = async () => {
    const { data: allAds } = await supabase.from("ads").select("budget, status");
    const activeAds = allAds?.filter((a) => a.status === "active").length || 0;
    const totalRevenue = allAds?.filter((a) => a.status === "active" || a.status === "expired").reduce((sum, a) => sum + a.budget, 0) || 0;

    const { count: views } = await supabase.from("ad_analytics").select("id", { count: "exact", head: true }).eq("event_type", "view");
    const { count: clicks } = await supabase.from("ad_analytics").select("id", { count: "exact", head: true }).eq("event_type", "click");

    setStats({ totalRevenue, activeAds, totalViews: views || 0, totalClicks: clicks || 0 });
  };

  const handleApprove = async (adId: string) => {
    const now = new Date();
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;
    const expiresAt = new Date(now.getTime() + ad.duration_days * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("ads").update({
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    }).eq("id", adId);

    if (error) { toast.error("Failed to approve"); return; }
    toast.success("Ad approved! ✅");
    fetchAds();
    fetchStats();
  };

  const handleReject = async (adId: string) => {
    const { error } = await supabase.from("ads").update({ status: "rejected" }).eq("id", adId);
    if (error) { toast.error("Failed to reject"); return; }
    toast.success("Ad rejected");
    fetchAds();
  };

  const handleDelete = async (adId: string) => {
    if (!window.confirm("Delete this ad?")) return;
    await supabase.from("ads").delete().eq("id", adId);
    toast.success("Ad deleted");
    fetchAds();
    fetchStats();
  };

  const filteredAds = tab === "all" ? ads : ads.filter((a) => a.status === tab);

  if (loading) return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className="text-secondary font-semibold">Loading...</div></div></AppLayout>;

  if (!isAdmin) return (
    <AppLayout>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground font-serif mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
        <button onClick={() => navigate("/")} className="mt-4 px-6 py-2 bg-primary text-secondary rounded-xl font-semibold text-sm">Go Home</button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 pt-5 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
          <h1 className="text-secondary font-bold text-lg font-serif flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Admin Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: IndianRupee, label: "Revenue", value: `₹${stats.totalRevenue.toLocaleString()}` },
            { icon: Megaphone, label: "Active Ads", value: stats.activeAds },
            { icon: Eye, label: "Total Views", value: stats.totalViews.toLocaleString() },
            { icon: MousePointer, label: "Total Clicks", value: stats.totalClicks.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-3 text-center border border-secondary/20">
              <s.icon className="w-4 h-4 text-secondary mx-auto mb-1" />
              <p className="text-lg font-bold text-secondary">{s.value}</p>
              <p className="text-[10px] text-secondary/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {(["pending", "active", "expired", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all ${
                tab === t ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"
              }`}
            >
              {t} ({t === "all" ? ads.length : ads.filter((a) => a.status === t).length})
            </button>
          ))}
        </div>

        {filteredAds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No {tab} ads</p>
        ) : (
          <div className="space-y-3">
            {filteredAds.map((ad, i) => (
              <motion.div key={ad.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-3 shadow-card border border-border/30"
              >
                <div className="flex gap-3">
                  {ad.image_url && <img src={ad.image_url} alt={ad.ad_title} className="w-20 h-20 rounded-xl object-cover shrink-0" />}
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
                      <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ad.duration_days}d</span>
                    </div>
                    <p className="text-xs font-bold text-secondary mt-1">₹{ad.budget}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(ad.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {ad.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApprove(ad.id)} className="flex-1 py-2 bg-primary text-secondary rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-all">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleReject(ad.id)} className="flex-1 py-2 bg-destructive/10 text-destructive rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-destructive/20 transition-all">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                <button onClick={() => handleDelete(ad.id)} className="mt-2 w-full py-1.5 text-destructive text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-destructive/5 rounded-lg transition-all">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
