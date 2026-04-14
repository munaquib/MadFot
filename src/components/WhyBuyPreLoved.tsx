import { IndianRupee, Leaf, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const WhyBuyPreLoved = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 md:px-6 mt-6 mb-6">
      <h2 className="text-base md:text-lg font-bold text-foreground font-serif mb-3">✦ Why Buy Pre-Loved?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 shadow-card border border-secondary/40 flex items-center gap-3 bg-primary"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <IndianRupee className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary">Save Money</p>
            <p className="text-xs text-secondary/70 mt-0.5">Save upto ₹80,000 on designer wear</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4 shadow-card border border-secondary/40 flex items-center gap-3 bg-primary"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary">Save Planet</p>
            <p className="text-xs text-secondary/70 mt-0.5">57kg textile waste reduced per outfit</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/sell")}
          className="rounded-2xl p-4 shadow-card border border-secondary/40 flex items-center gap-3 cursor-pointer hover:shadow-luxury transition-all bg-primary"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-secondary">Earn ₹ from your wardrobe!</p>
            <p className="text-xs text-secondary/70 mt-0.5">Turn your closet into cash</p>
            <span className="text-[10px] font-bold text-secondary/90 mt-1 inline-block">Sell Your Closet →</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default WhyBuyPreLoved;
