import { ArrowLeft, Package, Truck, CheckCircle, Clock, ShoppingBag, Sparkles, Bell, MapPin, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Order {
  id: string;
  order_number?: string;
  product_id?: string;
  product_title: string;
  amount: number;
  created_at: string;
  status: string;
  order_type?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  rental_days?: number;
  deposit_amount?: number;
}

const statusFlow = ["processing", "shipped", "delivered"];

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

// "returned"/"cancelled" internal status values ka user-facing wording alag rakhte
// hain, taaki buyer ko na lage ki unhone khud kuch kiya hai.
const getStatusLabel = (status: string) => {
  if (status?.toLowerCase() === "returned") return "Reset by seller";
  if (status?.toLowerCase() === "cancelled") return "Cancelled";
  return status;
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
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchImagesForOrders = async (orderList: Order[]) => {
    const productIds = Array.from(new Set(orderList.map((o) => o.product_id).filter(Boolean))) as string[];
    if (productIds.length === 0) return;
    const { data: products } = await supabase.from("products").select("id, images").in("id", productIds);
    if (products) {
      const map: Record<string, string> = {};
      products.forEach((p: any) => { if (p.images?.length) map[p.id] = p.images[0]; });
      setProductImages((prev) => ({ ...prev, ...map }));
    }
  };

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
        fetchImagesForOrders(data as any);
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
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            fetchImagesForOrders([newOrder]);
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
              const currentStepIndex = statusFlow.indexOf((order.status || "processing").toLowerCase());
              const isRental = order.order_type === "rental";
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => order.product_id && navigate(`/product/${order.product_id}`)}
                  className="glass-card rounded-2xl border border-border/30 shadow-card hover:shadow-luxury transition-all duration-300 cursor-pointer overflow-hidden">
                  {/* Product summary row */}
                  <div className="p-4 flex gap-3 items-center">
                    <img
                      src={(order.product_id && productImages[order.product_id]) || "/placeholder.svg"}
                      alt={order.product_title}
                      className="w-16 h-16 rounded-xl object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{order.product_title}</h3>
                        {isRental && (
                          <span className="text-[9px] font-bold bg-secondary/10 text-secondary px-1.5 py-0.5 rounded-full shrink-0">🔄 Rental</span>
                        )}
                      </div>
                      {isRental && order.rental_start_date && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          📅 {formatDate(order.rental_start_date)} → {formatDate(order.rental_end_date || "")} ({order.rental_days} days)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm font-bold text-secondary">₹{order.amount?.toLocaleString("en-IN")}</span>
                        {isRental && order.deposit_amount && (
                          <span className="text-[10px] text-muted-foreground">+ ₹{order.deposit_amount?.toLocaleString("en-IN")} deposit</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0 ${color}`}>
                      <Icon className="w-3 h-3" /> {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Status stepper */}
                  <div className="px-4 pb-4 pt-1 border-t border-border/20">
                    <div className="flex items-center justify-between mt-3">
                      {statusFlow.map((step, idx) => {
                        const reached = idx <= currentStepIndex;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${reached ? "bg-emerald-50 border-emerald-300 text-emerald-600" : "bg-muted border-border text-muted-foreground"}`}>
                                {step === "processing" && <Clock className="w-3.5 h-3.5" />}
                                {step === "shipped" && <Truck className="w-3.5 h-3.5" />}
                                {step === "delivered" && <CheckCircle className="w-3.5 h-3.5" />}
                              </div>
                              <span className={`text-[9px] font-semibold capitalize ${reached ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                            </div>
                            {idx < statusFlow.length - 1 && (
                              <div className={`h-0.5 flex-1 mx-1 ${idx < currentStepIndex ? "bg-emerald-300" : "bg-border"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
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
