import { useEffect, useState } from "react";
import { X, ExternalLink, Trash2, MapPin, Eye, BadgeCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdminProductModalProps {
  productId: string;
  onClose: () => void;
  onRemove: (productId: string) => void | Promise<void>;
}

// Ye fields already upar alag se dikhte hain, isliye "More details" mein dobara nahi aayenge.
const PRODUCT_SHOWN_KEYS = new Set([
  "id", "user_id", "title", "description", "price", "original_price", "images",
  "condition", "category", "location", "status", "views_count", "created_at", "updated_at",
]);
const PROFILE_SHOWN_KEYS = new Set([
  "id", "user_id", "full_name", "avatar_url", "is_verified", "is_banned", "created_at", "updated_at",
]);
// Sensitive info (bank / payment / ID details) admin popup mein kabhi nahi dikhayenge.
const SENSITIVE_KEY = /bank|account|ifsc|upi|password|token|secret|aadhaar|aadhar|pan_|_pan|gst|razorpay|cashfree/i;

const prettyKey = (k: string) => k.replace(/_/g, " ");

const collectExtras = (row: Record<string, any> | null, skip: Set<string>) => {
  if (!row) return [] as [string, string][];
  return Object.entries(row)
    .filter(([k, v]) => {
      if (skip.has(k) || SENSITIVE_KEY.test(k)) return false;
      if (v === null || v === undefined || v === "") return false;
      if (typeof v === "object") return false;
      if (typeof v === "string" && (v.length > 140 || v.startsWith("http"))) return false;
      return true;
    })
    .map(([k, v]) => [prettyKey(k), typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)] as [string, string]);
};

const AdminProductModal = ({ productId, onClose, onRemove }: AdminProductModalProps) => {
  const [product, setProduct] = useState<Record<string, any> | null>(null);
  const [seller, setSeller] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
      if (cancelled) return;
      setProduct((p as any) || null);
      if (p && (p as any).user_id) {
        const { data: s } = await supabase.from("profiles").select("*").eq("user_id", (p as any).user_id).maybeSingle();
        if (!cancelled) setSeller((s as any) || null);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [productId]);

  // Esc dabane par band ho, aur popup ke peeche ka page scroll na kare
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const images: string[] = Array.isArray(product?.images) ? product!.images : [];
  const productExtras = collectExtras(product, PRODUCT_SHOWN_KEYS);
  const sellerExtras = collectExtras(seller, PROFILE_SHOWN_KEYS);

  const prevImg = () => setImgIndex((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIndex((i) => (i + 1) % images.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-background w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl shadow-luxury border border-border/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground font-serif">Listing Details</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-16">Loading...</p>
        ) : !product ? (
          <p className="text-sm text-muted-foreground text-center py-16">Ye listing ab available nahi hai (delete ho chuki ho sakti hai).</p>
        ) : (
          <div className="p-4 space-y-4">
            {/* Photos */}
            {images.length > 0 ? (
              <div>
                <div className="relative rounded-2xl overflow-hidden bg-muted">
                  <img src={images[imgIndex]} alt={product.title} className="w-full h-64 md:h-80 object-cover" />
                  {images.length > 1 && (
                    <>
                      <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center" aria-label="Previous photo">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center" aria-label="Next photo">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {imgIndex + 1} / {images.length}
                      </span>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
                    {images.map((src, i) => (
                      <img
                        key={src + i}
                        src={src}
                        alt={`Photo ${i + 1}`}
                        onClick={() => setImgIndex(i)}
                        className={`w-14 h-14 rounded-lg object-cover shrink-0 cursor-pointer border-2 ${i === imgIndex ? "border-secondary" : "border-transparent opacity-70"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6 bg-muted rounded-2xl">No photos uploaded</p>
            )}

            {/* Title + price */}
            <div>
              <h2 className="text-base font-bold text-foreground font-serif">{product.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-extrabold text-secondary">₹{Number(product.price || 0).toLocaleString("en-IN")}</p>
                {product.original_price ? (
                  <p className="text-xs text-muted-foreground line-through">₹{Number(product.original_price).toLocaleString("en-IN")}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {product.category && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{product.category}</span>}
                {product.condition && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{product.condition}</span>}
                {product.status && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{product.status}</span>}
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {product.views_count || 0} views
                </span>
                {product.location && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {product.location}
                  </span>
                )}
              </div>
              {product.created_at && (
                <p className="text-[10px] text-muted-foreground mt-2">Listed on {new Date(product.created_at).toLocaleDateString()}</p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-xs font-bold text-foreground mb-1">Description</p>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Other listing fields (size, brand, etc. — jo bhi table mein hai) */}
            {productExtras.length > 0 && (
              <div>
                <p className="text-xs font-bold text-foreground mb-1">More details</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {productExtras.map(([k, v]) => (
                    <p key={k} className="text-[10px] text-muted-foreground capitalize">
                      {k}: <span className="text-foreground font-medium normal-case">{v}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Seller */}
            <div className="glass-card rounded-2xl p-3 border border-border/30">
              <p className="text-xs font-bold text-foreground mb-2">Seller</p>
              {seller ? (
                <>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    {seller.full_name || "Unknown"}
                    {seller.is_verified && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {seller.is_banned && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Banned</span>
                    )}
                  </p>
                  {sellerExtras.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                      {sellerExtras.map(([k, v]) => (
                        <p key={k} className="text-[10px] text-muted-foreground capitalize">
                          {k}: <span className="text-foreground font-medium normal-case">{v}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Seller info nahi mili</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => window.open(`/product/${product.id}`, "_blank")}
                className="flex-1 py-2.5 bg-primary text-secondary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Public Page
              </button>
              <button
                onClick={() => onRemove(product.id)}
                className="flex-1 py-2.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-destructive/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Listing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProductModal;
