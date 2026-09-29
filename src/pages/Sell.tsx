import { useState, useRef, useEffect } from "react";
import { Camera, Image, ChevronDown, X, Loader2, Truck, MapPin, Pencil, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import LocationPicker from "@/components/LocationPicker";

const categories = ["Lehenga", "Sherwani", "Saree", "Suit", "Kurti", "Gown", "Indo-Western", "Other"];

const SHIPPING_CHARGE = 100;

// iPhone/iPad camera se aayi photos HEIC/HEIF format mein hoti hain, jise browsers
// (Chrome, Firefox, Android) directly nahi dikha sakte. Isliye upload se pehle
// aise files ko JPEG mein convert karte hain. Library sirf tabhi load hoti hai
// jab zaroorat ho (dynamic import), taaki baaki uploads slow na ho.
const isHeicFile = (file: File) => {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") || type === "image/heic" || type === "image/heif";
};

const convertHeicToJpeg = async (file: File): Promise<File> => {
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob as Blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.error("HEIC conversion failed:", err);
    // Conversion fail ho jaye toh bhi original file return karo, taaki upload
    // poori tarah na atak jaye — baaki images post ho jayengi
    return file;
  }
};

// Upload se pehle image ko resize + compress karta hai:
// - Max 1200x1200 (width AND height, jo bhi bada ho use limit karta hai)
// - JPEG format
// - Quality 80% se shuru, phir automatically kam karta hai jab tak ~500KB ke aas-paas na aa jaye (max 700KB tak accept)
const compressImage = (file: File): Promise<File> => {
  const MAX_DIMENSION = 1200;
  const TARGET_SIZE = 500 * 1024; // 500KB soft target
  const HARD_MAX_SIZE = 700 * 1024; // 700KB hard cap — isse zyada quality kam nahi karenge

  return new Promise((resolve) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        // Chahe width badi ho ya height, dono ko 1200px tak limit karo (aspect ratio maintain karke)
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const tryCompress = (quality: number, attempt: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              // Agar target size mil gaya, ya quality bahut kam ho gayi (50% se neeche na jaayein), ya 5 attempts ho gaye — stop karo
              if (blob.size <= TARGET_SIZE || quality <= 0.5 || attempt >= 5 || blob.size <= HARD_MAX_SIZE) {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                // Abhi bhi bahut badi hai, thoda aur quality kam karke try karo
                tryCompress(quality - 0.1, attempt + 1);
              }
            },
            "image/jpeg",
            quality
          );
        };
        tryCompress(0.8, 1);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

// HEIC ho toh pehle JPEG mein convert karo, phir normal resize/compress chalao
const prepareImageForUpload = async (file: File): Promise<File> => {
  const jpegFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
  return compressImage(jpegFile);
};

const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];
const conditions = ["New with Tags", "Like New", "Good", "Fair"];

// ---- Pickup address helpers ----
type PickupAddr = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_ADDR: PickupAddr = { name: "", phone: "", address: "", city: "", state: "", pincode: "" };

// Phone se sirf digits rakho; +91 / 91 prefix ho toh hata do
const cleanPhone = (p: string) => {
  let d = (p || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  return d;
};

// Kaunsi field abhi galat/khali hai — button ke neeche hint dikhane ke liye
const addrProblems = (a: PickupAddr): string[] => {
  const out: string[] = [];
  if (!a.name.trim()) out.push("name");
  if (cleanPhone(a.phone).length !== 10) out.push("10-digit phone");
  if (a.address.trim().length < 8) out.push("full address");
  if (!a.city.trim()) out.push("city");
  if (!a.state.trim()) out.push("state");
  if (!/^\d{6}$/.test(a.pincode.trim())) out.push("6-digit pincode");
  return out;
};

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
  const [listingType, setListingType] = useState<"sell" | "rent" | "both">("sell");
  const [rentPricePerDay, setRentPricePerDay] = useState("");
  const [rentDeposit, setRentDeposit] = useState("");
  const [minRentDays, setMinRentDays] = useState("1");
  const [maxRentDays, setMaxRentDays] = useState("30");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [oldPrice, setOldPrice] = useState<number | null>(null);

  // Pickup address (profile se load hota hai, yahin inline edit hota hai)
  const [addr, setAddr] = useState<PickupAddr>(EMPTY_ADDR);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [addrLoaded, setAddrLoaded] = useState(false);
  // "form" = seller address bhar/edit kar raha hai, "confirm" = saved address dikha kar poochho sahi hai na
  const [addrMode, setAddrMode] = useState<"form" | "confirm">("form");
  const [addrConfirmed, setAddrConfirmed] = useState(false);
  const [pinLooking, setPinLooking] = useState(false);
  // Jis pincode ka lookup ho chuka (ya jo already saved hai), uska dobara lookup nahi hoga
  const lookedPin = useRef("");
  // Seller ne Location khud type/detect ki ho to auto-fill usse overwrite nahi karega
  const locationEdited = useRef(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone, full_name, pickup_name, pickup_phone, pickup_address, pickup_city, pickup_state, pickup_pincode")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setProfilePhone(d.phone || null);
          const loaded: PickupAddr = {
            name: d.pickup_name || d.full_name || "",
            phone: d.pickup_phone || d.phone || "",
            address: d.pickup_address || "",
            city: d.pickup_city || "",
            state: d.pickup_state || "",
            pincode: d.pickup_pincode || "",
          };
          setAddr(loaded);
          // Pehle se poora address saved hai to seller ko sirf confirm karwao
          if (d.pickup_address && addrProblems(loaded).length === 0) {
            lookedPin.current = loaded.pincode.trim();
            setAddrMode("confirm");
          }
        }
        setAddrLoaded(true);
      });
  }, [user]);

  // Pincode ke 6 digit poore hote hi city + state apne aap bhar do (India Post ki free service)
  useEffect(() => {
    const pin = addr.pincode.trim();
    if (addrMode !== "form" || !/^\d{6}$/.test(pin) || pin === lookedPin.current) return;
    lookedPin.current = pin;
    let cancelled = false;
    setPinLooking(true);
    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const po = data?.[0]?.PostOffice?.[0];
        if (data?.[0]?.Status === "Success" && po) {
          setAddr((prev) =>
            prev.pincode.trim() === pin
              ? { ...prev, city: po.District || prev.city, state: po.State || prev.state }
              : prev
          );
        } else {
          lookedPin.current = "";
          toast.error("Pincode not found. Please check it, or enter city and state manually.");
        }
      })
      .catch(() => {
        // Service down ho to seller city/state khud likh sakta hai
        lookedPin.current = "";
      })
      .finally(() => {
        if (!cancelled) setPinLooking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addr.pincode, addrMode]);

  // Location khali ho aur seller ne khud kuch na likha ho to pickup city se bhar do
  useEffect(() => {
    const city = addr.city.trim();
    if (!city || location.trim() || locationEdited.current) return;
    const st = addr.state.trim();
    setLocation(st && st !== city ? `${city}, ${st}` : city);
  }, [addr.city, addr.state, location]);

  const setAddrField = (key: keyof PickupAddr, value: string) => {
    setAddr((prev) => ({ ...prev, [key]: value }));
  };

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

  const finalCategoryValue = category === "Other" ? customCategory.trim() : category;

  // Post button ke liye: kya-kya abhi baaki hai
  const missing: string[] = [];
  if (!title.trim()) missing.push("title");
  if (!price) missing.push("price");
  if (!finalCategoryValue) missing.push("category");
  if (images.length === 0) missing.push("photo");
  if (!addrLoaded) missing.push("address is loading");
  else if (addrMode === "confirm" && !addrConfirmed) missing.push("confirm your address");
  else if (addrMode === "form") {
    const p = addrProblems(addr);
    if (p.length > 0) missing.push("pickup address (" + p.join(", ") + ")");
  }
  const canPost = missing.length === 0 && !submitting;

  const handleSubmit = async () => {
    if (!user || !canPost) return;
    const cleanedPhone = cleanPhone(addr.phone);

    setSubmitting(true);
    try {
      // 1. Address profile mein save karo (agli baar seller ko wahi dikhega)
      const profileUpdate: Record<string, any> = {
        pickup_name: addr.name.trim(),
        pickup_phone: cleanedPhone,
        pickup_address: addr.address.trim(),
        pickup_city: addr.city.trim(),
        pickup_state: addr.state.trim(),
        pickup_pincode: addr.pincode.trim(),
      };
      // Buyers seller ko call kar sakein, isliye profile ka phone khali ho to yahi number bhar do
      if (!profilePhone) profileUpdate.phone = cleanedPhone;

      const { error: addrError } = await supabase
        .from("profiles")
        .update(profileUpdate as any)
        .eq("user_id", user.id);
      if (addrError) {
        toast.error("Could not save address. Please try again.");
        return;
      }
      if (!profilePhone) setProfilePhone(cleanedPhone);

      // 2. Ab listing post karo
      await proceedSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  const proceedSubmit = async () => {
    if (!user) return;
    try {
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const compressed = await prepareImageForUpload(file);
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, compressed, {
            contentType: "image/jpeg",
            cacheControl: "31536000",
            upsert: false,
          });
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
        delivery_available: true,
        delivery_charge: SHIPPING_CHARGE,
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
    }
  };

  const inputClass =
    "w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30";

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
                placeholder="Type your category (e.g. Jacket, Waistcoat)"
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
              onChange={(loc, lt, ln) => { locationEdited.current = true; setLocation(loc); setLat(lt); setLng(ln); }}
              placeholder="Your city (tap the arrow to detect)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-2">
              <Truck className="w-4 h-4" /> Delivery
            </label>
            <div className="glass-card rounded-xl p-3 border border-border/30 space-y-1">
              <p className="text-sm text-foreground">MadFod will deliver your parcel to the buyer by courier.</p>
              <p className="text-xs text-muted-foreground">
                The buyer pays ₹{SHIPPING_CHARGE} for shipping. You pay nothing and there is no commission. The courier will pick up the parcel from your saved address.
              </p>
            </div>
          </div>

          {/* Pickup address — sell, rent aur sell+rent teeno listing types ke liye */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Pickup Address
            </label>

            {!addrLoaded ? (
              <div className="glass-card rounded-xl p-4 border border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading your saved address...
              </div>
            ) : addrMode === "confirm" ? (
              <div className={`glass-card rounded-xl p-3 border space-y-3 ${addrConfirmed ? "border-secondary/50" : "border-border/30"}`}>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{addr.name}</p>
                  <p className="text-xs text-foreground">{addr.address}</p>
                  <p className="text-xs text-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                  <p className="text-xs text-muted-foreground">Phone: {cleanPhone(addr.phone)}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">The courier will pick up the parcel from this address. Is it correct?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddrConfirmed(true)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${addrConfirmed ? "bg-secondary/10 text-secondary border-2 border-secondary" : "bg-primary text-secondary hover:opacity-90"}`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> {addrConfirmed ? "Confirmed" : "Yes, this is correct"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddrMode("form"); setAddrConfirmed(false); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border-2 border-border/40 text-foreground flex items-center justify-center gap-1.5 hover:bg-muted/40 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-3 border border-border/30 space-y-3">
                <p className="text-[10px] text-muted-foreground">
                  This address is saved once. Next time you list something, you only need to confirm it.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                    <input type="text" value={addr.name} onChange={(e) => setAddrField("name", e.target.value)}
                      placeholder="Full name" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <input type="tel" inputMode="numeric" value={addr.phone} onChange={(e) => setAddrField("phone", e.target.value)}
                      placeholder="10-digit number" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                    <textarea rows={2} value={addr.address} onChange={(e) => setAddrField("address", e.target.value)}
                      placeholder="House/flat no., street, area, landmark"
                      className={inputClass + " resize-none"} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">City</label>
                    <input type="text" value={addr.city} onChange={(e) => setAddrField("city", e.target.value)}
                      placeholder="e.g. Meerut" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">State</label>
                    <input type="text" value={addr.state} onChange={(e) => setAddrField("state", e.target.value)}
                      placeholder="e.g. Uttar Pradesh" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Pincode</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={addr.pincode}
                      onChange={(e) => setAddrField("pincode", e.target.value.replace(/\D/g, ""))}
                      placeholder="6-digit pincode" className={inputClass} />
                    {pinLooking && <p className="text-[10px] text-muted-foreground mt-1">Finding city and state...</p>}
                  </div>
                </div>
              </div>
            )}
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

        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!canPost}
            className="w-full py-3.5 bg-primary text-secondary rounded-xl font-bold text-sm shadow-card hover:opacity-90 transition-all duration-200 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:opacity-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : "👗 Post Ad — Sell Now"}
          </button>
          {!canPost && !submitting && (
            <p className="text-[11px] text-center text-muted-foreground">
              Still needed: {missing.join(" • ")}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Sell;
