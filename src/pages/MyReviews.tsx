import { useEffect, useState } from "react";
import { ArrowLeft, Star, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  products?: {
    title: string;
  };
}

const MyReviews = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, product_id, rating, comment, created_at, products(title)")
        .eq("reviewer_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReviews(data as unknown as Review[]);
      }
      setLoading(false);
    };
    fetchReviews();
  }, [user]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">My Reviews</h1>
          <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
            {reviews.length}
          </span>
        </div>

        <div className="space-y-3 max-w-2xl mx-auto">
          {loading ? (
            <p className="text-center text-muted-foreground text-sm py-10">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No reviews yet</p>
              <p className="text-xs text-muted-foreground text-center">
                Your reviews will appear here after you rate a seller
              </p>
            </motion.div>
          ) : (
            reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-4 border border-border/30 shadow-card hover:shadow-luxury transition-all duration-300"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {review.products?.title || "Product"}
                </h3>
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={`w-3.5 h-3.5 ${
                        j < review.rating
                          ? "fill-secondary text-secondary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{review.rating}/5</span>
                </div>
                {review.comment && (
                  <p className="text-xs text-muted-foreground mt-2">{review.comment}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {formatDate(review.created_at)}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyReviews;
