import { ArrowLeft, Heart, Share2, MapPin, Shield, MessageCircle, CreditCard, ShieldCheck, ChevronLeft, ChevronRight, X, IndianRupee, Send, Trash2, Megaphone, Truck, BadgeCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import PromoteModal from "@/components/PromoteModal";
import SellerReviews from "@/components/SellerReviews";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [paying, setPaying] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sellerName, setSellerName] = useState("MadFot Seller");
  const [sellerAvgRating, setSellerAvgRating] = useState(0);
  const [sellerTotalReviews, setSellerTotalReviews] = useState(0);
  const [sellerIsVerified, setSellerIsVerified] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [showPromote, setShowPromote] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (data && !error) {
        setProduct(data);
        const { data: prof } = await supabase.from("profiles").select("full_name, avg_rating, total_reviews, is_verified").eq("user_id", data.user_id).single();
        if (prof?.full_name) setSellerName(prof.full_name);
        if ((prof as any)?.avg_rating) setSellerAvgRating((prof as any).avg_rating);
        if ((prof as any)?.total_reviews) setSellerTotalReviews((prof as any).total_reviews);
        if ((prof as any)?.is_verified) setSellerIsVerified((prof as any).is_verified);
        if (user) {
          const { data: wl } = await supabase.from("wishlist").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle();
          setInWishlist(!!wl);
        }
      } else {
        toast.error("Product not found");
        navigate("/");
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, navigate, user]);

  const toggleWishlist = async () => {
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    if (!id) return;
    if (inWishlist) {
      await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", id);
      setInWishlist(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist").insert({ user_id: user.id, product_id: id });
      setInWishlist(true);
      toast.success("Added to wishlist ❤️");
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    setPaying(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-order`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ amount: product.price, product_title: product.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");
      const options = {
        key: data.key_id, amount: data.order.amount, currency: data.order.currency, name: "MadFot", description: product.title, order_id: data.order.id,
        handler: function () { toast.success("Payment successful! 🎉 Order placed."); },
        prefill: { name: user.user_metadata?.full_name || "", email: user.email || "", contact: "" },
        theme: { color: "#0F3D2E" },
        modal: { ondismiss: () => toast.info("Payment cancelled") },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) { toast.error(err.message || "Payment failed"); }
    finally { setPaying(false); }
  };

  const images = product?.images?.length ? product.images : ["/placeholder.svg"];
  const totalImages = images.length;

  const goToPrev = () => setCurrentImageIndex((prev: number) => (prev - 1 + totalImages) % totalImages);
  const goToNext = () => setCurrentImageIndex((prev: number) => (prev + 1) % totalImages);

  const handleMakeOffer = () => {
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    if (!offerPrice.trim() || Number(offerPrice) <= 0) {
      toast.error("Please enter a valid offer price");
      return;
    }
    const offer = Number(offerPrice);
    toast.success(`Offer of ₹${offer.toLocaleString("en-IN")} sent to ${sellerName}! 🎉`);
    setShowOfferDialog(false);
    setOfferPrice("");
    // Navigate to chat with offer message
    navigate(`/chat?seller_id=${product.user_id}&product_id=${product.id}&offer=${offer}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out ${product?.title} on MadFot for ₹${product?.price?.toLocaleString("en-IN")}!`;
    if (navigator.share) {
      try { await navigator.share({ title: product?.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard! 📋");
    }
  };

  const handleDelete = async () => {
    if (!product || !user || product.user_id !== user.id) return;
    const confirmed = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmed) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) { toast.error("Failed to delete listing"); return; }
    toast.success("Listing deleted successfully! 🗑️");
    navigate("/profile");
  };

  if (loading) return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className="text-secondary font-semibold">Loading...</div></div></AppLayout>;
  if (!product) return null;

  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;

  return (
    <AppLayout>
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-2 lg:py-6">
        {/* Image Section with Carousel */}
        <div className="relative">
          <div className="absolute top-4 left-4 z-10 lg:hidden">
            <button onClick={() => navigate(-1)} className="w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          </div>
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card"><Share2 className="w-4 h-4 text-foreground" /></button>
            <button onClick={toggleWishlist} className="w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card">
              <Heart className={`w-5 h-5 ${inWishlist ? "text-destructive fill-destructive" : "text-secondary"}`} />
            </button>
            {user && product?.user_id === user.id && (
              <button onClick={handleDelete} className="w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card"><Trash2 className="w-4 h-4 text-destructive" /></button>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-muted/30 flex items-center justify-center py-8 lg:rounded-2xl lg:overflow-hidden relative cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          >
            <img src={images[currentImageIndex]} alt={product.title} className="h-64 md:h-80 lg:h-[28rem] object-contain" />
          </motion.div>

          {/* Prev/Next Arrows */}
          {totalImages > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card z-10 hover:bg-card transition-colors">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 glass-card rounded-full flex items-center justify-center shadow-card z-10 hover:bg-card transition-colors">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}

          {/* Dots */}
          {totalImages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_: string, i: number) => (
                <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentImageIndex ? "bg-secondary scale-125" : "bg-muted-foreground/30"}`} />
              ))}
            </div>
          )}

          {/* Thumbnails */}
          {totalImages > 1 && (
            <div className="flex gap-2 mt-3 px-4 lg:px-0 overflow-x-auto">
              {images.map((img: string, i: number) => (
                <button key={i} onClick={() => setCurrentImageIndex(i)}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${i === currentImageIndex ? "border-secondary shadow-card" : "border-border/30 opacity-60 hover:opacity-100"}`}
                >
                  <img src={img} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 pt-4 lg:px-0">
          <button onClick={() => navigate(-1)} className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to listings</button>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground font-serif">{product.title}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{product.category}</p>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <span className="text-xl md:text-2xl font-extrabold text-secondary">₹{product.price.toLocaleString("en-IN")}</span>
            {product.original_price && (
              <>
                <span className="text-sm text-muted-foreground line-through">₹{product.original_price.toLocaleString("en-IN")}</span>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
            <span className="text-[10px] md:text-xs font-semibold text-secondary">Verified Authentic</span>
          </div>
          <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-4 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {product.location}</span>
            <span>•</span>
            <span>{product.condition}</span>
            {product.size && <><span>•</span><span>Size: {product.size}</span></>}
          </div>
          {/* Delivery Info */}
          {(product as any)?.delivery_available && (
            <div className="flex items-center gap-2 mb-3 bg-emerald-50/50 rounded-xl px-3 py-2 border border-emerald-200/50">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">
                {(product as any).delivery_charge > 0
                  ? `Home Delivery Available — ₹${(product as any).delivery_charge}`
                  : "Free Home Delivery Available 🎉"}
              </span>
            </div>
          )}

          {product.description && (
            <div className="glass-card rounded-2xl p-3 md:p-4 shadow-card border border-border/30 mb-4">
              <h3 className="text-sm font-bold text-foreground font-serif mb-1">Description</h3>
              <p className="text-xs md:text-sm text-muted-foreground">{product.description}</p>
            </div>
          )}
          <div className="glass-card rounded-2xl p-3 md:p-4 shadow-card border border-border/30 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-secondary font-bold text-sm">{sellerName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{sellerName}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">{sellerIsVerified ? <><BadgeCheck className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600 font-semibold">Verified Seller</span></> : <><Shield className="w-3 h-3 text-secondary" /> Seller</>}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => navigate(`/chat?seller_id=${product.user_id}&product_id=${product.id}`)} className="flex-1 py-3 glass-card border-2 border-primary text-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-card hover:bg-primary/5 transition-all duration-200">
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
            <button onClick={() => { if (!user) { toast.error("Please login first"); navigate("/login"); return; } setShowOfferDialog(true); }}
              className="flex-1 py-3 glass-card border-2 border-secondary text-secondary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-card hover:bg-secondary/5 transition-all duration-200"
            >
              <IndianRupee className="w-4 h-4" /> Make Offer
            </button>
          </div>
          {user && product?.user_id === user.id && (
            <button onClick={() => setShowPromote(true)} className="w-full py-3 glass-card border-2 border-secondary text-secondary rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-2 shadow-card hover:bg-secondary/5 transition-all duration-200">
              <Megaphone className="w-4 h-4" /> Promote This Product
            </button>
          )}
          <div className="mb-6">
            <button onClick={handleBuyNow} disabled={paying}
              className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all duration-200"
            >
              <CreditCard className="w-4 h-4" /> {paying ? "Processing..." : "Buy Now"}
            </button>
          </div>

          {/* Seller Reviews */}
          {product && (
            <SellerReviews
              sellerId={product.user_id}
              avgRating={sellerAvgRating}
              totalReviews={sellerTotalReviews}
              canReview={!!user && user.id !== product.user_id}
              productId={product.id}
            />
          )}
        </div>
      </div>

      {/* Make Offer Dialog */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Make an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Listed Price</p>
              <p className="text-xl font-extrabold text-secondary">₹{product.price.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Your Offer Price (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Enter your price"
                  className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>
            </div>
            <button
              onClick={handleMakeOffer}
              className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200"
            >
              <Send className="w-4 h-4" /> Send Offer
            </button>
            <p className="text-[10px] text-muted-foreground text-center">The seller will be notified of your offer via chat</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button onClick={() => setLightboxOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
              <X className="w-6 h-6" />
            </button>
            {totalImages > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); goToPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); goToNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
            <img src={images[currentImageIndex]} alt={product.title} className="max-h-[85vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
              {currentImageIndex + 1} / {totalImages}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promote Modal */}
      {product && (
        <PromoteModal
          open={showPromote}
          onOpenChange={setShowPromote}
          product={product}
        />
      )}
    </AppLayout>
  );
};

export default ProductDetail;
