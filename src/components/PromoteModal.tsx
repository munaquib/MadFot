import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Upload, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PromoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; title: string; price: number; images?: string[] | null };
}

const placements = [
  { value: "top-banner", label: "Top Banner (Homepage Carousel)", desc: "Maximum visibility" },
  { value: "in-feed", label: "In-Feed (Between Products)", desc: "Blends with listings" },
];

const durations = [
  { days: 1, label: "1 Day" },
  { days: 3, label: "3 Days" },
  { days: 7, label: "7 Days" },
];

// Sirf dikhane ke liye. Asli price server (ad-order function) tay karta hai — dono jagah same rakhna.
const adPrices: Record<string, Record<number, number>> = {
  "top-banner": { 1: 99, 3: 249, 7: 499 },
  "in-feed": { 1: 49, 3: 129, 7: 249 },
};

// Product ka naam lamba ho sakta hai, lekin ad title ki limit 100 characters hai (server pe bhi yahi limit hai).
// Default title ko 100 se chhota karte hain, aakhri adhoora shabd hata kar.
const makeDefaultTitle = (t: string) =>
  t.length <= 100 ? t : t.slice(0, 100).replace(/\s+\S*$/, "").trim();

const PromoteModal = ({ open, onOpenChange, product }: PromoteModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [adTitle, setAdTitle] = useState(makeDefaultTitle(product.title));
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState("in-feed");
  const [durationDays, setDurationDays] = useState(3);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const price = adPrices[placement]?.[durationDays] ?? 0;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerImage(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!adTitle.trim()) { toast.error("Please enter an ad title"); return; }
    if (adTitle.trim().length > 100) { toast.error("Ad title 100 characters se chhota rakho"); return; }
    setSubmitting(true);

    try {
      let imageUrl = product.images?.[0] || "";

      if (bannerImage) {
        const ext = bannerImage.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("ad-images").upload(path, bannerImage);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("ad-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Please login again");

      // Price server pe tay hoti hai; yahan se sirf choices jaati hain
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          ad_title: adTitle.trim(),
          description: description.trim(),
          image_url: imageUrl || null,
          placement,
          duration_days: durationDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment setup failed");

      // Cashfree ka payment popup form dialog ke upar theek se kaam kare, isliye dialog pehle band karte hain
      onOpenChange(false);

      const cashfree = (window as any).Cashfree({ mode: "production" });
      const result = await cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        redirectTarget: "_modal",
      });

      if (result?.error) throw new Error(result.error.message || "Payment cancelled");
      if (result?.paymentDetails) {
        toast.success("Payment received! 🎉 Your ad will go live once it is approved.");
        resetForm();
      } else if (result?.redirect) {
        toast.info("Redirecting to payment...");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ad");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setAdTitle(makeDefaultTitle(product.title));
    setDescription("");
    setPlacement("in-feed");
    setDurationDays(3);
    setBannerImage(null);
    setBannerPreview(null);
  };

  const selectedDuration = durations.find((d) => d.days === durationDays);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-secondary" />
            {step === "form" ? "Promote Your Product" : "Ad Preview"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4 pt-2">
            {/* Ad Title */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ad Title</label>
              <input
                type="text"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Short Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Highlight what makes this special..."
                className="w-full bg-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none"
              />
            </div>

            {/* Banner Image */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Banner Image (Optional)</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center cursor-pointer hover:border-secondary/50 transition-colors"
              >
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner" className="w-full h-32 object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">Upload banner image</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>

            {/* Placement */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Ad Placement</label>
              <div className="space-y-2">
                {placements.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlacement(p.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                      placement === p.value
                        ? "border-secondary bg-secondary/5"
                        : "border-border/30 hover:border-border/50"
                    }`}
                  >
                    <span className="font-medium text-foreground">{p.label}</span>
                    <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration (price placement ke hisaab se badalti hai) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {durations.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => setDurationDays(d.days)}
                    className={`px-3 py-2 rounded-xl border-2 text-center transition-all ${
                      durationDays === d.days
                        ? "border-secondary bg-secondary/5"
                        : "border-border/30 hover:border-border/50"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{d.label}</span>
                    <p className="text-[10px] text-secondary font-bold">₹{adPrices[placement][d.days]}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("preview")}
              className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            >
              <Eye className="w-4 h-4" /> Preview Ad
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Preview */}
            <div className="glass-card rounded-2xl overflow-hidden border border-border/30 shadow-card">
              <div className="relative">
                <img
                  src={bannerPreview || product.images?.[0] || "/placeholder.svg"}
                  alt={adTitle}
                  className="w-full h-40 object-cover"
                />
                <span className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Megaphone className="w-2.5 h-2.5" /> Sponsored
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-foreground">{adTitle}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                <p className="text-base font-extrabold text-secondary mt-1">₹{product.price.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card rounded-xl p-3 border border-border/30 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Placement</span>
                <span className="font-medium text-foreground">{placements.find((p) => p.value === placement)?.label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">{selectedDuration?.label}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount to pay</span>
                <span className="font-bold text-secondary">₹{price}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-3 glass-card border-2 border-primary text-primary rounded-xl font-semibold text-sm hover:bg-primary/5 transition-all"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                {submitting ? "Please wait..." : `Pay ₹${price}`}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Your ad goes live after review. If it is not approved, the amount will be refunded.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PromoteModal;
