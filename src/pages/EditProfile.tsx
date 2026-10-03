import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const cleanPhone = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const inputCls =
  "w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Pickup address (used by the courier to collect sold items)
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupState, setPickupState] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setAvatarUrl(data.avatar_url || null);
        const d = data as any;
        setPickupName(d.pickup_name || "");
        setPickupPhone(d.pickup_phone || "");
        setPickupAddress(d.pickup_address || "");
        setPickupCity(d.pickup_city || "");
        setPickupState(d.pickup_state || "");
        setPickupPincode(d.pickup_pincode || "");
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    setUploading(false);

    if (updateError) {
      toast.error("Failed to save avatar");
    } else {
      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated!");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Pickup address is optional for buyers. If any pickup field is filled,
    // all of them must be valid so the courier gets a complete address.
    const pName = pickupName.trim();
    const pPhone = cleanPhone(pickupPhone);
    const pAddress = pickupAddress.trim();
    const pCity = pickupCity.trim();
    const pState = pickupState.trim();
    const pPincode = pickupPincode.trim();
    const anyPickup = !!(pName || pickupPhone.trim() || pAddress || pCity || pState || pPincode);

    if (anyPickup) {
      if (pName.length < 2) return toast.error("Pickup address: enter the full name");
      if (!/^[6-9]\d{9}$/.test(pPhone)) return toast.error("Pickup address: enter a valid 10-digit mobile number");
      if (pAddress.length < 10) return toast.error("Pickup address: enter the complete address (house no, street, area)");
      if (pCity.length < 2) return toast.error("Pickup address: enter the city");
      if (!pState) return toast.error("Pickup address: select the state");
      if (!/^\d{6}$/.test(pPincode)) return toast.error("Pickup address: enter a valid 6-digit pincode");
    }

    setSaving(true);
    const updates: Record<string, string> = {
      full_name: fullName,
      phone,
      location,
    };
    if (anyPickup) {
      updates.pickup_name = pName;
      updates.pickup_phone = pPhone;
      updates.pickup_address = pAddress;
      updates.pickup_city = pCity;
      updates.pickup_state = pState;
      updates.pickup_pincode = pPincode;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select("user_id");
    setSaving(false);
    if (error || !data || data.length === 0) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
      navigate("/settings");
    }
  };

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";
  const stateOptions = pickupState && !STATES.includes(pickupState) ? [pickupState, ...STATES] : STATES;

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/settings")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">Edit Profile</h1>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-secondary/20" />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-secondary text-2xl font-bold border-4 border-secondary/20">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shadow-card cursor-pointer hover:opacity-90 transition-opacity"
              >
                {uploading ? <Loader2 className="w-4 h-4 text-secondary-foreground animate-spin" /> : <Camera className="w-4 h-4 text-secondary-foreground" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Enter your full name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="City, State" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <input value={user?.email || ""} disabled className="w-full bg-muted/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-border/40">
            <div>
              <h2 className="text-base font-bold text-foreground font-serif mt-4">Pickup Address</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Sellers: the courier collects your sold items from this address. Leave it empty if you only buy.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
              <input value={pickupName} onChange={(e) => setPickupName(e.target.value)} className={inputCls} placeholder="Name of the person handing over the parcel" autoComplete="name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mobile Number</label>
              <input value={pickupPhone} onChange={(e) => setPickupPhone(e.target.value)} className={inputCls} placeholder="10-digit mobile number" inputMode="numeric" maxLength={14} autoComplete="tel" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Complete Address</label>
              <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} className={inputCls} placeholder="House no, street, area, landmark" autoComplete="street-address" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                <input value={pickupCity} onChange={(e) => setPickupCity(e.target.value)} className={inputCls} placeholder="City" autoComplete="address-level2" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Pincode</label>
                <input value={pickupPincode} onChange={(e) => setPickupPincode(e.target.value)} className={inputCls} placeholder="6 digits" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">State</label>
              <select value={pickupState} onChange={(e) => setPickupState(e.target.value)} className={inputCls}>
                <option value="">Select state</option>
                {stateOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default EditProfile;
