import { ArrowLeft, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";

const orders = [
  { id: "ORD-2026-001", title: "Bridal Red Lehenga", price: "₹12,500", date: "25 Mar 2026", status: "Delivered", icon: CheckCircle, color: "text-emerald-700 bg-emerald-50" },
  { id: "ORD-2026-002", title: "Golden Sherwani", price: "₹8,000", date: "22 Mar 2026", status: "In Transit", icon: Truck, color: "text-secondary bg-secondary/10" },
  { id: "ORD-2026-003", title: "Silk Saree", price: "₹5,500", date: "18 Mar 2026", status: "Processing", icon: Clock, color: "text-amber-700 bg-amber-50" },
];

const MyOrders = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">My Orders</h1>
          <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{orders.length}</span>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {orders.map((order, i) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-4 border border-border/30 shadow-card hover:shadow-luxury transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{order.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${order.color}`}>
                  <order.icon className="w-3 h-3" /> {order.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{order.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-secondary">{order.price}</span>
                <span className="text-xs text-muted-foreground">{order.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyOrders;
