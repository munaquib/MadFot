import { ArrowLeft, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";

const reviews = [
  { product: "Bridal Lehenga", rating: 5, comment: "Excellent quality! Looked brand new.", date: "20 Mar 2026" },
  { product: "Designer Kurta Set", rating: 4, comment: "Good condition, slight color fade.", date: "15 Mar 2026" },
  { product: "Silk Dupatta", rating: 5, comment: "Beautiful piece, exactly as described.", date: "10 Mar 2026" },
];

const MyReviews = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">My Reviews</h1>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {reviews.map((review, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-4 border border-border/30 shadow-card hover:shadow-luxury transition-all duration-300"
            >
              <h3 className="text-sm font-semibold text-foreground">{review.product}</h3>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? "fill-secondary text-secondary" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{review.comment}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">{review.date}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyReviews;
