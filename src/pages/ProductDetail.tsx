import { ArrowLeft, Heart, Share2, MapPin, Shield, MessageCircle, CreditCard, ShieldCheck, ChevronLeft, ChevronRight, X, IndianRupee, Send, Trash2, Megaphone, Truck, BadgeCheck, MoreVertical, Flag, Ban } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
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
  const [sellerName, setSellerName] = useState("MadFod Seller");
  const [sellerAvgRating, setSellerAvgRating] = useState(0);
  const [sellerTotalReviews, setSellerTotalReviews] = useState(0);
  const [sellerIsVerified, setSellerIsVerified] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [showPromote, setShowPromote] = useState(false);

  // Similar items state
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  // Report/Block states
  const [showSellerMenu, setShowSellerMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const sellerMenuRef = useRef<HTMLDivElement>(null);

  // Close seller menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sellerMenuRef.current && !sellerMenuRef.current.contains(e.target as Node)) {
        setShowSellerMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        // Fetch similar items — same category, exclude current product
        if (data.category) {
          const { data: similar } = await supabase
            .from("products")
            .select("id, title, price, images")
            .eq("category", data.category)
            .neq("id", id)
            .limit(6);
          setSimilarProducts(similar || []);
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
        key: data.key_id, amount: data.order.amount, currency: data.order.currency, name: "MadFod", description: product.title, order_id: data.order.id,
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
    navigate(`/chat?seller_id=${product.user_id}&product_id=${product.id}&offer=${offer}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out ${product?.title} on MadFod for ₹${product?.price?.toLocaleString("en-IN")}!`;
    if (navigator.share) {
      try { await navigator.share({ title: product?.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard! 📋");
    }
  };

  const handleShareWhatsApp = () => {
    const rawUrl = window.location.href;
    const url = rawUrl.includes("localhost")
      ? `https://mad-fod.vercel.app/product/${product?.id}`
      : rawUrl;
    const text = `🛍️ *${product?.title}* — MadFod pe sirf ₹${product?.price?.toLocaleString("en-IN")} mein!\n\n${product?.description ? product.description.substring(0, 100) + "...\n\n" : ""}👉 ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
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

  // Report seller
  const handleReportSeller = async () => {
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    if (!reportReason.trim()) { toast.error("Please select a reason"); return; }
    setReportSubmitting(true);
    try {
      await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: product.user_id,
        product_id: product.id,
        reason: reportReason,
        type: "seller",
      });
      toast.success("Report submitted. We'll review it shortly. 🙏");
      setShowReportDialog(false);
      setReportReason("");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Block seller
  const handleBlockSeller = async () => {
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    try {
      await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: product.user_id,
      });
      toast.success(`${sellerName} has been blocked. You won't see their listings anymore.`);
      setShowBlockDialog(false);
      navigate("/");
    } catch {
      toast.error("Failed to block user. Please try again.");
    }
  };

  if (loading) return <AppLayout><div className="min-h-screen flex items-center justify-center"><div className="text-secondary font-semibold">Loading...</div></div></AppLayout>;
  if (!product) return null;

  const discount = product.original_price ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;

  return (
    <AppLayout>
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-2 lg:py-6">
        {/* Image Section with Carousel */}
        <div className="relative">
          <div className="relative aspect-[3/4] md:aspect-square overflow-hidden rounded-b-3xl lg:rounded-3xl bg-muted">
            <img
              src={images[currentImageIndex]}
              alt={product.title}
              className="w-full h-full object-contain cursor-pointer bg-muted"
              onClick={() => setLightboxOpen(true)}
            />
            {totalImages > 1 && (
              <>
                <button onClick={goToPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={goToNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-10">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_: any, idx: number) => (
                    <button key={idx} onClick={() => setCurrentImageIndex(idx)} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? "bg-white w-4" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute top-3 left-3 flex gap-2 z-10">
              <button onClick={() => navigate(-1)} className="w-9 h-9 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <button onClick={handleShare} className="w-9 h-9 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={toggleWishlist} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${inWishlist ? "bg-red-500 text-white" : "bg-black/30 text-white hover:bg-black/50"}`}>
                <Heart className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
              </button>
              {user && product?.user_id === user.id && (
                <button onClick={handleDelete} className="w-9 h-9 bg-red-500/80 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="px-4 md:px-0 py-4 md:py-0">
          <h1 className="text-lg md:text-2xl font-bold text-foreground font-serif mb-1">{product.title}</h1>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-2xl md:text-3xl font-extrabold text-secondary">₹{product.price.toLocaleString("en-IN")}</span>
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

          {/* Seller Card with Report/Block menu */}
          <div className="glass-card rounded-2xl p-3 md:p-4 shadow-card border border-border/30 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-secondary font-bold text-sm">
                {sellerName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{sellerName}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  {sellerIsVerified
                    ? <><BadgeCheck className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600 font-semibold">Verified Seller</span></>
                    : <><Shield className="w-3 h-3 text-secondary" /> Seller</>}
                </p>
              </div>
            </div>

            {/* 3-dot menu — only show if viewer is NOT the seller */}
            {user && product?.user_id !== user.id && (
              <div className="relative" ref={sellerMenuRef}>
                <button
                  onClick={() => setShowSellerMenu(prev => !prev)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                {showSellerMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute right-0 top-10 z-50 bg-card border border-border/50 rounded-2xl shadow-luxury overflow-hidden min-w-[160px]"
                  >
                    <button
                      onClick={() => { setShowSellerMenu(false); if (!user) { toast.error("Please login first"); navigate("/login"); return; } setShowReportDialog(true); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Flag className="w-4 h-4 text-orange-500" /> Report Seller
                    </button>
                    <button
                      onClick={() => { setShowSellerMenu(false); if (!user) { toast.error("Please login first"); navigate("/login"); return; } setShowBlockDialog(true); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50/50 transition-colors"
                    >
                      <Ban className="w-4 h-4" /> Block Seller
                    </button>
                  </motion.div>
                )}
              </div>
            )}
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

          {/* WhatsApp Share Button */}
          <div className="mb-6">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: "#25D366", color: "#fff" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.528 5.856L.057 23.882a.5.5 0 0 0 .611.611l6.056-1.479A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.67-.523-5.193-1.434l-.372-.215-3.853.94.972-3.756-.234-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Share on WhatsApp
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

      {/* Similar Items */}
      {similarProducts.length > 0 && (
        <div className="px-4 md:px-6 py-4">
          <h2 className="text-base font-bold text-foreground font-serif mb-3">Similar Items ✨</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {similarProducts.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/product/${item.id}`)}
                className="glass-card rounded-2xl overflow-hidden border border-border/30 shadow-card cursor-pointer hover:shadow-luxury transition-all duration-300"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={item.images?.[0] || "/placeholder.svg"}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                  <p className="text-xs font-bold text-secondary">₹{item.price?.toLocaleString("en-IN")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

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

      {/* Report Seller Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" /> Report Seller
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">Please select a reason for reporting <span className="font-semibold text-foreground">{sellerName}</span>:</p>
            {[
              "Fake or misleading listing",
              "Spam or scam",
              "Inappropriate content",
              "Counterfeit / fake product",
              "Harassment or abuse",
              "Other",
            ].map((reason) => (
              <button
                key={reason}
                onClick={() => setReportReason(reason)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all duration-200 ${reportReason === reason ? "border-orange-400 bg-orange-50/50 text-orange-700 font-semibold" : "border-border/50 text-foreground hover:bg-muted"}`}
              >
                {reason}
              </button>
            ))}
            <button
              onClick={handleReportSeller}
              disabled={!reportReason || reportSubmitting}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all duration-200 mt-2"
            >
              <Flag className="w-4 h-4" /> {reportSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Seller Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" /> Block Seller
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to block <span className="font-semibold text-foreground">{sellerName}</span>?
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              <li>You won't see their listings anymore</li>
              <li>They won't be able to message you</li>
              <li>You can unblock them from your settings</li>
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockDialog(false)}
                className="flex-1 py-2.5 glass-card border border-border/50 text-foreground rounded-xl font-semibold text-sm hover:bg-muted transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockSeller}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Ban className="w-4 h-4" /> Block
              </button>
            </div>
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
