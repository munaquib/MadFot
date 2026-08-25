import { useState, useRef, useEffect } from "react";
import { Camera, Image, ChevronDown, X, Loader2, Truck, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationPicker from "@/components/LocationPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const categories = ["Lehenga", "Sherwani", "Saree", "Suit", "Kurti", "Gown", "Indo-Western", "Other"];

// Upload se pehle image ko resize + compress karta hai (max 1200px width, JPEG 80% quality)
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const maxWidth = 1200;
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const conditions = ["New with Tags", "Like New", "Good", "Fair"];

const Sell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [listingType, setListingType] = useState<"sell" | "rent" | "both">("sell");
  const [rentPricePerDay, setRentPricePerDay] = useState("");
  const [rentDeposit, setRentDeposit] = useState("");
  const [minRentDays, setMinRentDays] = useState("1");
  const [maxRentDays, setMaxRentDays] = useState("30");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [oldPrice, setOldPrice] = useState<number | null>(null);

  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone").eq("user_id", user.id).single().then(({ data }) => {
      if (data) setMyPhone((data as any).phone || null);
    });
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    const newImages = [...images, ...files];
    setImages(newImages);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;
    const finalCategory = category === "Other" ? customCategory.trim() : category;
    if (!title || !price || !finalCategory) {
      toast.error("Please fill in Title, Price, and Category");
      return;
    }
    if (images.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }
    if (!myPhone) {
      setPhoneInput("");
      setShowPhoneDialog(true);
      return;
    }

    await proceedSubmit();
  };

  const handleSavePhoneAndContinue = async () => {
    if (!user) return;
    const trimmed = phoneInput.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    const { error } = await supabase.from("profiles").update({ phone: trimmed } as any).eq("user_id", user.id);
    if (error) { toast.error("Failed to save number"); return; }
    setMyPhone(trimmed);
    setShowPhoneDialog(false);
    toast.success("Number saved! 📞");
    await proceedSubmit();
  };

  const proceedSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const compressed = await compressImage(file);
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, compressed);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const finalCategory = category === "Other" ? customCategory.trim() : category;

      const { error: insertError } = await supabase.from("products").insert({
        user_id: user.id,
        title,
        price: parseInt(price),
        original_price: originalPrice ? parseInt(originalPrice) : null,
        category: finalCategory,
        size: size || null,
        condition: condition || "Good",
        location: location || "Meerut",
        description: description || null,
        images: uploadedUrls,
        latitude: lat || null,
        longitude: lng || null,
        delivery_available: deliveryAvailable,
        delivery_charge: deliveryAvailable && deliveryCharge ? parseFloat(deliveryCharge) : 0,
        listing_type: listingType,
        rent_price_per_day: (listingType === "rent" || listingType === "both") && rentPricePerDay ? parseFloat(rentPricePerDay) : null,
        rent_deposit: (listingType === "rent" || listingType === "both") && rentDeposit ? parseFloat(rentDeposit) : null,
        min_rent_days: (listingType === "rent" || listingType === "both") ? parseInt(minRentDays) || 1 : null,
        max_rent_days: (listingType === "rent" || listingType === "both") ? parseInt(maxRentDays) || 30 : null,
      } as any);

      if (insertError) throw insertError;

      if (editProductId && oldPrice !== null && parseInt(price) < oldPrice) {
        const { data: wishlistUsers } = await supabase
          .from("wishlist")
          .select("user_id")
          .eq("product_id", editProductId);
        if (wishlistUsers && wishlistUsers.length > 0) {
          const notifications = wishlistUsers.map((w: any) => ({
            user_id: w.user_id,
            type: "price_drop",
            title: "💸 Price Drop Alert!",
            message: `"${title}" price dropped from ₹${oldPrice.toLocaleString("en-IN")} to ₹${parseInt(price).toLocaleString("en-IN")}!`,
            is_read: false,
          }));
          await supabase.from("notifications").insert(notifications);
        }
      }
      toast.success("Product listed successfully! 🎉");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to list product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 py-5 rounded-b-[2rem] lg:rounded-b-3xl">
        <h1 className="text-secondary font-bold text-lg md:text-xl font-serif">Sell Your Outfit</h1>
        <p className="text-secondary/60 text-xs md:text-sm">Give your premium clothes a new home on MadFod</p>
      </div>

      <div className="px-4 md:px-6 py-4 max-w-2xl mx-auto space-y-4">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="border-2 border-dashed border-secondary/30 rounded-2xl p-8 flex flex-col items-center gap-2 glass-card cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-card">
            <Camera className="w-7 h-7 text-secondary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Add Photos</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">Upload up to 5 photos • Front, back & details</p>
          <div className="flex gap-2 mt-2 flex-wrap justify-center">
            {previews.length > 0
              ? previews.map((src, i) => (
                  <div key={i} className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-border overflow-hidden relative group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              : [1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-14 h-14 md:w-16 md:h-16 rounded-xl border border-border bg-muted/50 flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                ))}
          </div>
        </motion.div>

        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-1 block">Title</label>
            <input type="text" placeholder="e.g. Red Bridal Lehenga, Size M" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Price (₹)</label>
            <input type="number" placeholder="Enter your asking price" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Original Price (₹)</label>
            <input type="number" placeholder="What was the MRP?" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)}
              className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-transparent">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {category === "Other" && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Apni category type karo (e.g. Jacket, Waistcoat)"
                className="mt-2 w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Size</label>
            <div className="relative">
              <select value={size} onChange={(e) => setSize(e.target.value)}
                className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-transparent">
                <option value="">Select size</option>
                {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Condition</label>
            <div className="relative">
              <select value={condition} onChange={(e) => setCondition(e.target.value)}
                className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 md:py-3 pr-8 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-transparent">
                <option value="">Select condition</option>
                {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Location</label>
            <LocationPicker
              value={location}
              onChange={(loc, lt, ln) => { setLocation(loc); setLat(lt); setLng(ln); }}
              placeholder="Your city (tap 📍 to detect)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-2">
              <Truck className="w-4 h-4" /> Delivery Options
            </label>
            <div className="glass-card rounded-xl p-3 border border-border/30 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={deliveryAvailable} onChange={e => setDeliveryAvailable(e.target.checked)}
                  className="w-4 h-4 accent-yellow-600" />
                <span className="text-sm text-foreground">Offer Home Delivery</span>
              </label>
              {deliveryAvailable && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Delivery Charge (₹) — enter 0 for free delivery</label>
                  <input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full glass-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-2 block">Listing Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "sell", label: "Sell Only", emoji: "💰" },
                { value: "rent", label: "Rent Only", emoji: "🔄" },
                { value: "both", label: "Sell & Rent", emoji: "✨" },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setListingType(opt.value as any)}
                  className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${listingType === opt.value ? "border-secondary bg-secondary/10 text-secondary" : "border-border/30 text-muted-foreground"}`}>
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {(listingType === "rent" || listingType === "both") && (
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-foreground mb-2 block">🔄 Rent Details</label>
              <div className="glass-card rounded-xl p-3 border border-secondary/20 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Price per Day (₹)</label>
                    <input type="number" value={rentPricePerDay} onChange={e => setRentPricePerDay(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full glass-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Security Deposit (₹)</label>
                    <input type="number" value={rentDeposit} onChange={e => setRentDeposit(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full glass-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Min Days</label>
                    <input type="number" value={minRentDays} onChange={e => setMinRentDays(e.target.value)}
                      placeholder="1"
                      className="w-full glass-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Max Days</label>
                    <input type="number" value={maxRentDays} onChange={e => setMaxRentDays(e.target.value)}
                      placeholder="30"
                      className="w-full glass-card border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">💡 Security deposit will be refunded after item is returned in good condition.</p>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
            <textarea rows={3} placeholder="Describe your outfit — fabric, when worn, any flaws..." value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30 resize-none" />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : "👗 Post Ad — Sell Now"}
        </button>
      </div>

      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-secondary" /> Add Your Phone Number
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Buyers aapko call kar sakein, iske liye apna phone number add karo. Ye sirf interested buyers ko dikhega.
            </p>
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePhoneAndContinue()}
              placeholder="+91 XXXXX XXXXX"
              className="w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
            <button
              onClick={handleSavePhoneAndContinue}
              disabled={!phoneInput.trim() || submitting}
              className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : <><Phone className="w-4 h-4" /> Save & Post Ad</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Sell;
