import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Sellers (users with at least one listing) whose pickup address is incomplete
// see this popup. It cannot be closed until the address is saved.
// Buyers, and sellers who already filled the address, never see it.

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const empty = (v: unknown) => !v || String(v).trim() === "";

const cleanPhone = (v: string) => {
  const digits = v.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const inputCls =
  "w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50";

const PickupAddressGate = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", address: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    setOpen(false);
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, phone, pickup_name, pickup_phone, pickup_address, pickup_city, pickup_state, pickup_pincode")
          .eq("user_id", userId)
          .maybeSingle();
        // If anything fails, never block the user.
        if (error || !profile || cancelled) return;

        const missing =
          empty(profile.pickup_name) || empty(profile.pickup_phone) ||
          empty(profile.pickup_address) || empty(profile.pickup_city) ||
          empty(profile.pickup_state) || empty(profile.pickup_pincode);
        if (!missing) return;

        const { count, error: countError } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (countError || cancelled || !count || count < 1) return;

        setForm({
          name: profile.pickup_name || profile.full_name || "",
          phone: cleanPhone(profile.pickup_phone || profile.phone || ""),
          address: profile.pickup_address || "",
          city: profile.pickup_city || "",
          state: profile.pickup_state || "",
          pincode: profile.pickup_pincode || "",
        });
        setOpen(true);
      } catch {
        // ignore: popup is optional, app must keep working
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // Lock page scroll while the popup is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !userId) return null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const name = form.name.trim();
    const phone = cleanPhone(form.phone);
    const address = form.address.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    const pincode = form.pincode.trim();

    if (name.length < 2) return toast.error("Enter your full name");
    if (!/^[6-9]\d{9}$/.test(phone)) return toast.error("Enter a valid 10-digit mobile number");
    if (address.length < 10) return toast.error("Enter your complete address (house no, street, area)");
    if (city.length < 2) return toast.error("Enter your city");
    if (!state) return toast.error("Select your state");
    if (!/^\d{6}$/.test(pincode)) return toast.error("Enter a valid 6-digit pincode");

    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        pickup_name: name,
        pickup_phone: phone,
        pickup_address: address,
        pickup_city: city,
        pickup_state: state,
        pickup_pincode: pincode,
      })
      .eq("user_id", userId)
      .select("user_id");
    setSaving(false);

    if (error || !data || data.length === 0) {
      toast.error("Could not save the address. Please try again.");
      return;
    }
    toast.success("Pickup address saved");
    setOpen(false);
  };

  const stateOptions = form.state && !STATES.includes(form.state) ? [form.state, ...STATES] : STATES;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pickup-gate-title"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-background border border-border/50 shadow-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 id="pickup-gate-title" className="text-base font-bold text-foreground font-serif">
              Add your pickup address
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              The courier collects your sold items from this address. Buyers cannot order your products until it is added.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Full name</label>
            <input value={form.name} onChange={set("name")} className={inputCls} placeholder="Name of the person handing over the parcel" autoComplete="name" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Mobile number</label>
            <input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="10-digit mobile number" inputMode="numeric" maxLength={14} autoComplete="tel" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Email</label>
            <input value={user?.email || ""} disabled className="w-full bg-muted/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Complete address</label>
            <input value={form.address} onChange={set("address")} className={inputCls} placeholder="House no, street, area, landmark" autoComplete="street-address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">City</label>
              <input value={form.city} onChange={set("city")} className={inputCls} placeholder="City" autoComplete="address-level2" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Pincode</label>
              <input value={form.pincode} onChange={set("pincode")} className={inputCls} placeholder="6 digits" inputMode="numeric" maxLength={6} autoComplete="postal-code" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">State</label>
            <select value={form.state} onChange={set("state")} className={inputCls}>
              <option value="">Select state</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-5 py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : "Save address"}
        </button>
      </div>
    </div>
  );
};

export default PickupAddressGate;
