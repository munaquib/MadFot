import { ArrowLeft, Package, Truck, CheckCircle, Clock, ShoppingBag, Sparkles, Bell, MapPin, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Order {
  id: string;
  product_title: string;
  price: number;
  created_at: string;
  status: string;
}

const getStatusStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case "delivered":
      return { color: "text-emerald-700 bg-emerald-50", icon: CheckCircle };
    case "in transit":
    case "shipped":
      return { color: "text-yellow-700 bg-yellow-50", icon: Truck };
    case "processing":
    case "pending":
      return { color: "text-red-600 bg-red-50", icon: Clock };
    default:
      return { color: "text-muted-foreground bg-muted/50", icon: Package };
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const TrackingGuide = () => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className="max-w-2xl mx-auto mt-6 rounded-2xl overflow-hidden border border-secondary/20 shadow-luxury"
  >
    {/* Header */}
    <div className="bg-primary px-4 py-3 flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-secondary" />
      <span className="text-secondary font-bold text-sm font-serif">How to Track Your Order?</span>
    </div>

    {/* Steps */}
    <div className="bg-card p-4 space-y-0">

      {/* Step 1 */}
      <div className="flex gap-3 relative pb-4">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center shrink-0 z-10">
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="w-0.5 flex-1 bg-border/50 mt-1" />
        </div>
        <div className="pt-1 pb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Processing</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your order has been placed! 🎉 Waiting for seller confirmation. You will receive a <span className="font-semibold text-foreground">notification</span> once your order is confirmed.
          </p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex gap-3 relative pb-4">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center shrink-0 z-10">
            <Truck className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="w-0.5 flex-1 bg-border/50 mt-1" />
        </div>
        <div className="pt-1 pb-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">In Transit 🚚</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your order is on the way! Our delivery partner is heading to your address. A <span className="font-semibold text-foreground">Tracking ID</span> will be sent to your email.
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex gap-3 relative">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shrink-0 z-10">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Delivered ✅</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your order has been delivered! You can now <span className="font-semibold text-foreground">rate the seller</span> and share your experience. 🌟
          </p>
        </div>
      </div>

    </div>

    {/* Footer tips */}
    <div className="bg-secondary/5 border-t border-secondary/10 px-4 py-3 grid grid-cols-3 gap-2">
      <div className="flex flex-col items-center gap-1 text-center">
        <Bell className="w-4 h-4 text-secondary" />
        <span className="text-[10px] text-muted-foreground font-medium">Live Notifications</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <MapPin className="w-4 h-4 text-secondary" />
        <span className="text-[10px] text-muted-foreground font-medium">Real-time Tracking</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <Shield className="w-4 h-4 text-secondary" />
        <span className="text-[10px] text-muted-foreground font-medium">100% Secure</span>
      </div>
    </div>
  </motion.div>
);

const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as any);
      }
      setLoading(false);
    };
    fetchOrders();

    // Real-time: order status update pe auto refresh
    const channel = supabase
      .channel("my-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `buyer_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">My Orders</h1>
          <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{orders.length}</span>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading orders...</div>
          ) : orders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No orders yet</p>
              <p className="text-xs text-muted-foreground text-center">Your orders will appear here once you make a purchase</p>
              <button onClick={() => navigate("/")}
                className="mt-2 px-4 py-2 bg-primary text-secondary rounded-xl text-xs font-bold">
                Shop Now
              </button>
            </motion.div>
          ) : (
            orders.map((order, i) => {
              const { color, icon: Icon } = getStatusStyle(order.status);
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl p-4 border border-border/30 shadow-card hover:shadow-luxury transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-medium">{order.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${color}`}>
                      <Icon className="w-3 h-3" /> {order.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{order.product_title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-secondary">₹{order.price?.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Tracking Guide — hamesha dikhega */}
        <TrackingGuide />
      </div>
    </AppLayout>
  );
};

export default MyOrders;
