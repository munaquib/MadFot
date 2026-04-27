import { useState, useRef } from "react";
import { Camera, Image, ChevronDown, X, Loader2, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationPicker from "@/components/LocationPicker";

const categories = ["Lehenga", "Sherwani", "Saree", "Suit", "Kurti", "Gown", "Indo-Western", "Other"];
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
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();

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
    if (!title || !price || !category) {
      toast.error("Please fill in Title, Price, and Category");
      return;
    }
    if (images.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }

    setSubmitting(true);
    try {
      // Upload images
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert product
      const { error: insertError } = await supabase.from("products").insert({
        user_id: user.id,
        title,
        price: parseInt(price),
        original_price: originalPrice ? parseInt(originalPrice) : null,
        category,
        size: size || null,
        condition: condition || "Good",
        location: location || "Meerut",
        description: description || null,
        images: uploadedUrls,
        latitude: lat || null,
        longitude: lng || null,
        delivery_available: deliveryAvailable,
        delivery_charge: deliveryAvailable && deliveryCharge ? parseFloat(deliveryCharge) : 0,
      } as any);

      if (insertError) throw insertError;

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
    </AppLayout>
  );
};

export default Sell;
