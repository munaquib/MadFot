import { useState, useEffect } from "react";
import { ShieldCheck, Check, X, Megaphone, Eye, MousePointer, IndianRupee, Trash2, ArrowLeft, BadgeCheck, Users, Flag, Package, AlertTriangle, ShoppingBag } from "lucide-react";
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

interface Seller {
  user_id: string;
  full_name: string;
  is_verified: boolean;
  created_at: string;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  type: string;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

interface Order {
  id: string;
  order_number: string;
  product_title: string;
  buyer_name: string;
  seller_id: string;
  seller_name?: string;
  amount: number;
  shipping_charge: number | null;
  platform_commission: number | null;
  seller_payout_amount: number | null;
  status: string;
  payout_status: string | null;
  awb_code: string | null;
  courier_name: string | null;
  shiprocket_status: string | null;
  shiprocket_error: string | null;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  images: string[] | null;
  price: number;
  category: string | null;
  status: string | null;
  views_count: number | null;
  user_id: string;
  seller_name?: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Ad[]>([]);
  const [tab, setTab] = useState<"pending" | "active" | "expired" | "all" | "sellers" | "reports" | "orders" | "products">("pending");
  const [stats, setStats] = useState({ totalRevenue: 0, activeAds: 0, totalViews: 0, totalClicks: 0 });
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{ checked: number; mismatches: number; results: any[] } | null>(null);

  useEffect(() => {
    let channel: any;
    const checkAdmin = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (data) {
        await fetchAds();
        await fetchStats();
        await fetchSellers();
        await fetchReports();
        await fetchOrders();
        await fetchProducts();

        // Real-time: ads, profiles, reports, orders, products table changes pe auto refresh
        channel = supabase
          .channel("admin-realtime")
          .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, () => {
            fetchAds(); fetchStats();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
            fetchSellers();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
            fetchReports();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "ad_analytics" }, () => {
            fetchStats();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
            fetchOrders();
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
            fetchProducts();
          })
          .subscribe();

      }
      setLoading(false);
    };
    checkAdmin();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
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

  const fetchSellers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, is_verified, created_at").order("created_at", { ascending: false });
    setSellers((data as Seller[]) || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (!data) return;
    // Fetch names for reporter and reported users
    const userIds = [...new Set([...data.map((r: any) => r.reporter_id), ...data.map((r: any) => r.reported_user_id)])];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const getName = (id: string) => profiles?.find((p: any) => p.user_id === id)?.full_name || "Unknown";
    const enriched = data.map((r: any) => ({ ...r, reporter_name: getName(r.reporter_id), reported_name: getName(r.reported_user_id) }));
    setReports(enriched);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, product_title, buyer_name, seller_id, amount, shipping_charge, platform_commission, seller_payout_amount, status, payout_status, awb_code, courier_name, shiprocket_status, shiprocket_error, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!data) { setOrders([]); return; }
    const sellerIds = [...new Set(data.map((o: any) => o.seller_id).filter(Boolean))];
    let sellerMap: Record<string, string> = {};
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      profiles?.forEach((p: any) => { sellerMap[p.user_id] = p.full_name; });
    }
    const enriched = data.map((o: any) => ({ ...o, seller_name: sellerMap[o.seller_id] || "Unknown" }));
    setOrders(enriched as Order[]);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, title, images, price, category, status, views_count, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data) { setProducts([]); return; }
    const sellerIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
    let sellerMap: Record<string, string> = {};
    if (sellerIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      profiles?.forEach((p: any) => { sellerMap[p.user_id] = p.full_name; });
    }
    const enriched = data.map((p: any) => ({ ...p, seller_name: sellerMap[p.user_id] || "Unknown" }));
    setProducts(enriched as Product[]);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Delete this listing?")) return;
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) { toast.error("Failed to delete (order history may be linked)"); return; }
    toast.success("Listing deleted");
    fetchProducts();
  };

  const handleCheckPayments = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`https://ieauimziqompyevwrxwo.supabase.co/functions/v1/payment-reconcile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to check payments");
        setReconciling(false);
        return;
      }
      setReconcileResult(data);
      if (data.mismatches > 0) {
        toast.error(`${data.mismatches} payment mismatch(es) found`);
      } else {
        toast.success("All checked payments match ✅");
      }
    } catch (e) {
      toast.error("Failed to reach payment check");
    }
    setReconciling(false);
  };

  const handleApprove = async (adId: string) => {
    const now = new Date();
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;
    const expiresAt = new Date(now.getTime() + ad.duration_days * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("ads").update({ status: "active", starts_at: now.toISOString(), expires_at: expiresAt.toISOString() }).eq("id", adId);
    if (error) { toast.error("Failed to approve"); return; }
    toast.success("Ad approved! ✅");
    fetchAds(); fetchStats();
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
    fetchAds(); fetchStats();
  };

  const handleVerifySeller = async (sellerId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus }).eq("user_id", sellerId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(!currentStatus ? "Seller verified! ✅" : "Verification removed");
    fetchSellers();
  };

  const handleDeleteReport = async (reportId: string) => {
    await supabase.from("reports").delete().eq("id", reportId);
    toast.success("Report dismissed");
    fetchReports();
  };

  const filteredAds = tab === "all" || tab === "sellers" || tab === "reports" || tab === "orders" || tab === "products" ? ads : ads.filter((a) => a.status === tab);

  const needsAttentionOrders = orders.filter((o) => !!o.shiprocket_error || (o.shiprocket_status || "").toLowerCase().includes("fail"));

  const validOrders = orders.filter((o) => o.status !== "cancelled");
  const gmvStats = {
    totalSales: validOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
    totalShipping: validOrders.reduce((sum, o) => sum + (Number(o.shipping_charge) || 0), 0),
    totalCommission: validOrders.reduce((sum, o) => sum + (Number(o.platform_commission) || 0), 0),
    totalPayout: validOrders.reduce((sum, o) => sum + (Number(o.seller_payout_amount) || 0), 0),
  };

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

      <div className="px-4 md:px-6 mt-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {(["pending", "active", "expired", "all", "orders", "products", "sellers", "reports"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all flex items-center gap-1 ${tab === t ? "bg-primary text-secondary" : "bg-muted text-muted-foreground"}`}
            >
              {t === "sellers" && <Users className="w-3 h-3" />}
              {t === "reports" && <Flag className="w-3 h-3" />}
              {t === "orders" && <Package className="w-3 h-3" />}
              {t === "products" && <ShoppingBag className="w-3 h-3" />}
              {t}{" "}
              {t === "sellers"
                ? `(${sellers.length})`
                : t === "reports"
                ? `(${reports.length})`
                : t === "orders"
                ? `(${orders.length})`
                : t === "products"
                ? `(${products.length})`
                : `(${t === "all" ? ads.length : ads.filter((a) => a.status === t).length})`}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-foreground">Business Overview</p>
                <button
                  onClick={handleCheckPayments}
                  disabled={reconciling}
                  className="px-3 py-1.5 bg-primary text-secondary rounded-xl text-[10px] font-bold disabled:opacity-50"
                >
                  {reconciling ? "Checking..." : "Check Payments"}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {[
                  { label: "Total Sales (GMV)", value: `₹${gmvStats.totalSales.toLocaleString()}` },
                  { label: "Shipping Collected", value: `₹${gmvStats.totalShipping.toLocaleString()}` },
                  { label: "Platform Commission", value: `₹${gmvStats.totalCommission.toLocaleString()}` },
                  { label: "Seller Payouts", value: `₹${gmvStats.totalPayout.toLocaleString()}` },
                ].map((s) => (
                  <div key={s.label} className="glass-card rounded-xl p-3 text-center border border-border/30">
                    <p className="text-base font-bold text-foreground">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {reconcileResult && (
              <div>
                <p className="text-xs font-bold text-foreground mb-2">
                  Payment Check Results ({reconcileResult.checked} checked, {reconcileResult.mismatches} mismatch{reconcileResult.mismatches !== 1 ? "es" : ""})
                </p>
                <div className="space-y-2 mb-4">
                  {reconcileResult.results.filter((r: any) => r.mismatch).map((r: any) => (
                    <div key={r.order_number} className="glass-card rounded-xl p-3 border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{r.order_number}</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Cashfree: {r.cashfree_status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Local status: {r.local_status} — but Cashfree shows payment done. Check this order.</p>
                    </div>
                  ))}
                  {reconcileResult.mismatches === 0 && (
                    <p className="text-[11px] text-muted-foreground">No mismatches found in the last {reconcileResult.checked} pending/processing orders.</p>
                  )}
                </div>
              </div>
            )}

            {needsAttentionOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-bold text-destructive">Needs Attention ({needsAttentionOrders.length})</p>
                </div>
                <div className="space-y-2 mb-4">
                  {needsAttentionOrders.map((o) => (
                    <div key={o.id} className="glass-card rounded-xl p-3 border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{o.order_number}</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{o.shiprocket_status || "error"}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{o.product_title}</p>
                      {o.shiprocket_error && <p className="text-[10px] text-destructive mt-1">{o.shiprocket_error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="glass-card rounded-2xl p-3 shadow-card border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-foreground">{o.order_number}</p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        o.status === "delivered" ? "bg-primary/10 text-primary" :
                        o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                        o.status === "cancelled" ? "bg-destructive/10 text-destructive" :
                        "bg-secondary/10 text-secondary"
                      }`}>{o.status}</span>
                    </div>
                    <p className="text-[11px] text-foreground truncate">{o.product_title}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5">
                      <p className="text-[10px] text-muted-foreground">Buyer: <span className="text-foreground font-medium">{o.buyer_name || "—"}</span></p>
                      <p className="text-[10px] text-muted-foreground">Seller: <span className="text-foreground font-medium">{o.seller_name}</span></p>
                      <p className="text-[10px] text-muted-foreground">Amount: <span className="text-foreground font-medium">₹{o.amount}</span>{o.shipping_charge ? ` + ₹${o.shipping_charge}` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">Payout: <span className="text-foreground font-medium">{o.payout_status || "—"}</span></p>
                    </div>
                    {(o.awb_code || o.courier_name) && (
                      <p className="text-[10px] text-muted-foreground mt-1">{o.courier_name || "Courier"} — AWB: {o.awb_code || "—"}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString()}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No listings yet</p>
            ) : (
              products.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="glass-card rounded-2xl p-3 shadow-card border border-border/30"
                >
                  <div className="flex gap-3">
                    {p.images && p.images[0] && <img src={p.images[0]} alt={p.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{p.title}</p>
                      <p className="text-[10px] text-muted-foreground">Seller: <span className="text-foreground font-medium">{p.seller_name}</span></p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.category && <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.category}</span>}
                        {p.status && <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.status}</span>}
                        <span className="text-[9px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.views_count || 0} views</span>
                      </div>
                      <p className="text-xs font-bold text-secondary mt-1">₹{p.price}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="mt-2 w-full py-1.5 text-destructive text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-destructive/5 rounded-lg transition-all">
                    <Trash2 className="w-3 h-3" /> Remove Listing
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Sellers Tab */}
        {tab === "sellers" && (
          <div className="space-y-3">
            {sellers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No sellers yet</p>}
            {sellers.map((seller, i) => (
              <motion.div key={seller.user_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-3 shadow-card border border-border/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-secondary font-bold text-sm">
                    {seller.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{seller.full_name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(seller.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleVerifySeller(seller.user_id, seller.is_verified)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${seller.is_verified ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  {seller.is_verified ? "Verified ✅" : "Verify"}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reports yet 🙏</p>}
            {reports.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-3 shadow-card border border-border/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flag className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-foreground">{report.reason}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Reported by: <span className="font-semibold text-foreground">{report.reporter_name}</span></p>
                    <p className="text-[10px] text-muted-foreground">Against: <span className="font-semibold text-destructive">{report.reported_name}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="px-3 py-1.5 bg-muted text-muted-foreground rounded-xl text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Ads Tabs */}
        {tab !== "sellers" && tab !== "reports" && tab !== "orders" && tab !== "products" && (
          <>
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
