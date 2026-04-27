import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Upload, Image, Eye, IndianRupee, Loader2 } from "lucide-react";
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
  { days: 1, label: "1 Day", price: 49 },
  { days: 3, label: "3 Days", price: 129 },
  { days: 7, label: "7 Days", price: 249 },
];

const PromoteModal = ({ open, onOpenChange, product }: PromoteModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [adTitle, setAdTitle] = useState(product.title);
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState("in-feed");
  const [durationDays, setDurationDays] = useState(3);
  const [budget, setBudget] = useState(129);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerImage(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleDurationSelect = (d: typeof durations[number]) => {
    setDurationDays(d.days);
    setBudget(d.price);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!adTitle.trim()) { toast.error("Please enter an ad title"); return; }
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

      // Create Razorpay order for ad payment
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ amount: budget, product_title: adTitle }),
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Payment setup failed");

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: orderData.key_id,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "MadFod Ads",
          description: `Promote: ${adTitle}`,
          order_id: orderData.order.id,
          handler: () => resolve(),
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          theme: { color: "#0F3D2E" },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });

      const { error } = await supabase.from("ads").insert({
        user_id: user.id,
        product_id: product.id,
        ad_title: adTitle.trim(),
        description: description.trim() || null,
        image_url: imageUrl || null,
        placement,
        duration_days: durationDays,
        budget,
        status: "active",
        payment_status: "paid",
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      toast.success("Ad is now LIVE! 🎉 It will appear on the homepage immediately.");
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ad");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setAdTitle(product.title);
    setDescription("");
    setPlacement("in-feed");
    setDurationDays(3);
    setBudget(129);
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

            {/* Duration */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {durations.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => handleDurationSelect(d)}
                    className={`px-3 py-2 rounded-xl border-2 text-center transition-all ${
                      durationDays === d.days
                        ? "border-secondary bg-secondary/5"
                        : "border-border/30 hover:border-border/50"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{d.label}</span>
                    <p className="text-[10px] text-secondary font-bold">₹{d.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Budget */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Budget (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Higher budget = more visibility</p>
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
                <span className="text-muted-foreground">Budget</span>
                <span className="font-bold text-secondary">₹{budget}</span>
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
                {submitting ? "Submitting..." : "Submit Ad"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Ad will be reviewed before going live. Payment will be collected upon approval.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PromoteModal;
