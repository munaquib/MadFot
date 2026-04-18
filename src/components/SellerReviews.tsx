import { useState, useEffect } from "react";
import { Star, StarHalf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

interface Props {
  sellerId: string;
  avgRating?: number;
  totalReviews?: number;
  canReview?: boolean;
  productId?: string;
}

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => {
  const stars = [];
  const sz = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`${sz} ${i <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const SellerReviews = ({ sellerId, avgRating = 0, totalReviews = 0, canReview = false, productId }: Props) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [sellerId]);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("seller_reviews")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      // Fetch reviewer names
      const reviewerIds = data.map((r: any) => r.reviewer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", reviewerIds);

      const enriched = data.map((r: any) => ({
        ...r,
        reviewer_name: profiles?.find((p: any) => p.user_id === r.reviewer_id)?.full_name || "User",
      }));
      setReviews(enriched);
    }
    setLoading(false);
  };

  const submitReview = async () => {
    if (!user) { toast.error("Please login to review"); return; }
    if (!myComment.trim()) { toast.error("Please write a comment"); return; }
    setSubmitting(true);

    const { error } = await supabase.from("seller_reviews").insert({
      reviewer_id: user.id,
      seller_id: sellerId,
      product_id: productId || null,
      rating: myRating,
      comment: myComment.trim(),
    });

    if (error) {
      toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted! ⭐");
      setShowForm(false);
      setMyComment("");
      fetchReviews();
      // Notify seller about new review
      await supabase.from("notifications").insert({
        user_id: sellerId,
        type: "general",
        title: "Naya Review ⭐",
        message: `Aapko ${myRating} star review mila: "${myComment.trim().substring(0, 60)}${myComment.trim().length > 60 ? "..." : ""}"`,
        is_read: false,
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="glass-card rounded-2xl p-4 shadow-card border border-border/30">
      {/* Summary */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground font-serif">Seller Reviews</h3>
        {canReview && user && user.id !== sellerId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-secondary font-medium hover:underline"
          >
            {showForm ? "Cancel" : "+ Write Review"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl font-extrabold text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
        <div>
          <StarRating rating={Math.round(avgRating)} size="lg" />
          <p className="text-xs text-muted-foreground mt-0.5">{totalReviews} reviews</p>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-muted/40 rounded-xl p-3 mb-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Your Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setMyRating(s)}>
                  <Star className={`w-6 h-6 transition-colors ${s <= myRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            placeholder="Share your experience with this seller..."
            rows={3}
            className="w-full bg-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none"
          />
          <button
            onClick={submitReview}
            disabled={submitting}
            className="w-full py-2 bg-primary text-secondary rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {loading && <p className="text-xs text-muted-foreground py-2">Loading reviews...</p>}
      {!loading && reviews.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No reviews yet. Be the first!</p>
      )}
      <div className="space-y-2">
        {reviews.map(review => (
          <div key={review.id} className="border-t border-border/20 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">{review.reviewer_name}</p>
              <StarRating rating={review.rating} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SellerReviews;
