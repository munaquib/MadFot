import { ArrowLeft, Package, Truck, CheckCircle, Clock, Phone, MapPin, User, Copy } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [productImage, setProductImage] = useState<string>("/placeholder.svg");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).single();
      if (!error && data) {
        setOrder(data);
        if (data.product_id) {
          const { data: prod } = await supabase.from("products").select("images").eq("id", data.product_id).maybeSingle();
          if (prod?.images?.length) setProductImage(prod.images[0]);
        }
      } else {
        toast.error("Order not found");
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const copyAddress = () => {
    const full = `${order.buyer_name || ""}\n${order.delivery_address || ""}\n${order.delivery_city || ""} - ${order.delivery_pincode || ""}\nPhone: ${order.buyer_phone || ""}`;
    navigator.clipboard.writeText(full);
    toast.success("Address copied 📋");
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Order marked as ${newStatus} ✅`);
    }
    setUpdating(false);
  };

  if (loading) return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className="text-secondary font-semibold">Loading...</div></div></AppLayout>;
  if (!order) return null;

  const isSeller = !!(user && order.seller_id === user.id);
  const isBuyer = !!(user && order.buyer_id === user.id);
  const { color, icon: Icon } = getStatusStyle(order.status);
  const currentStepIndex = statusFlow.indexOf((order.status || "processing").toLowerCase());

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">Order Details</h1>
        </div>

        {/* Product card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => order.product_id && navigate(`/product/${order.product_id}`)}
          className={`glass-card rounded-2xl p-4 border border-border/30 shadow-card mb-4 flex gap-3 items-center ${order.product_id ? "cursor-pointer hover:shadow-luxury transition-all duration-200" : ""}`}>
          <img src={productImage} alt={order.product_title} className="w-16 h-16 rounded-xl object-cover bg-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{order.product_title}</p>
            {isSeller && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Buyer: {order.buyer_name || "Not provided"}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            <span className="text-sm font-bold text-secondary">₹{order.amount?.toLocaleString("en-IN")}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0 ${color}`}>
            <Icon className="w-3 h-3" /> {order.status}
          </span>
        </motion.div>

        {/* Buyer / delivery info — sirf seller ko dikhega */}
        {isSeller && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-4 border border-border/30 shadow-card mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground font-serif">Delivery Details</h3>
              <button onClick={copyAddress} className="flex items-center gap-1 text-xs text-secondary font-semibold hover:underline">
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{order.buyer_name || "Not provided"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <a href={`tel:${order.buyer_phone}`} className="text-sm text-secondary font-medium">{order.buyer_phone || "Not provided"}</a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">
                  {order.delivery_address ? (
                    <>{order.delivery_address}, {order.delivery_city} - {order.delivery_pincode}</>
                  ) : "Address not provided"}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status tracker */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4 border border-border/30 shadow-card mb-4">
          <h3 className="text-sm font-bold text-foreground font-serif mb-3">Order Status</h3>
          <div className="flex items-center justify-between">
            {statusFlow.map((step, idx) => {
              const reached = idx <= currentStepIndex;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${reached ? "bg-emerald-50 border-emerald-300 text-emerald-600" : "bg-muted border-border text-muted-foreground"}`}>
                      {step === "processing" && <Clock className="w-4 h-4" />}
                      {step === "shipped" && <Truck className="w-4 h-4" />}
                      {step === "delivered" && <CheckCircle className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-semibold capitalize ${reached ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                  </div>
                  {idx < statusFlow.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 ${idx < currentStepIndex ? "bg-emerald-300" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Seller actions — Mark as Shipped/Delivered (order ko age badhane ke liye) */}
        {isSeller && (order.status === "processing" || order.status === "shipped") && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex gap-3">
            {order.status === "processing" && (
              <button onClick={() => updateStatus("shipped")} disabled={updating}
                className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Truck className="w-4 h-4" /> Mark as Shipped
              </button>
            )}
            {order.status === "shipped" && (
              <button onClick={() => updateStatus("delivered")} disabled={updating}
                className="flex-1 py-3 bg-primary text-secondary rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Mark as Delivered
              </button>
            )}
          </motion.div>
        )}

        {/* Allow resale — order kisi bhi stage mein ho (Processing/Shipped/Delivered), seller
            jab chahe is buyer ke liye "Already Purchased" ko wapas "Buy Now" bana sakta hai.
            Ye zaroori nahi ki item wapas aaya ho — ho sakta hai seller ke paas same product
            ka ek aur piece already ho aur wo usse dobara bechna chahta ho. */}
        {isSeller && order.status !== "cancelled" && order.status !== "returned" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-3">
            <button onClick={() => updateStatus("returned")} disabled={updating}
              className="w-full py-3 border border-border text-foreground rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-muted transition-all flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> {updating ? "Updating..." : "Allow Buyer to Purchase Again"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">Isse ye product is buyer ke liye phir se "Buy Now" ban jayega — item wapas aana zaroori nahi.</p>
          </motion.div>
        )}

        {isSeller && order.status === "returned" && (
          <div className="text-center py-2">
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">Item marked as returned — available for resale</span>
          </div>
        )}

        {!isSeller && !isBuyer && (
          <p className="text-xs text-muted-foreground text-center mt-4">You don't have access to view full details of this order.</p>
        )}
      </div>
    </AppLayout>
  );
};

export default OrderDetail;
