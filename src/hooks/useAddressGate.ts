import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Ek hi shared address — Buy Now, Sell Now, Rent Now teeno isi ko use karte hain.
// Database mein wahi purane pickup_* columns (profiles table) mein save hota hai.
export type AddressForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export const emptyAddress: AddressForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export const isAddressComplete = (a: AddressForm) =>
  !!(
    a.name.trim() &&
    a.phone.trim().replace(/\D/g, "").length >= 10 &&
    a.address.trim() &&
    a.city.trim() &&
    a.state.trim() &&
    /^\d{6}$/.test(a.pincode.trim())
  );

export function useAddressGate(userId: string | undefined) {
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMode, setGateMode] = useState<"collect" | "confirm">("collect");
  const [gateAddress, setGateAddress] = useState<AddressForm>(emptyAddress);
  const [gateSaving, setGateSaving] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Buy Now / Sell Now / Rent Now dabate hi ye call hota hai.
  // Address khali ho to "collect" popup, bhara ho to "confirm" popup khulta hai.
  // Confirm ya save hone ke baad `onReady` chalta hai — jaise user ne pehle hi
  // asli button (buy/sell/rent) dabaya ho.
  const requestAddress = useCallback(
    async (onReady: () => void) => {
      if (!userId) return;
      const { data } = await supabase
        .from("profiles")
        .select("pickup_name, pickup_phone, pickup_address, pickup_city, pickup_state, pickup_pincode")
        .eq("user_id", userId)
        .maybeSingle();

      const current: AddressForm = {
        name: (data as any)?.pickup_name || "",
        phone: (data as any)?.pickup_phone || "",
        address: (data as any)?.pickup_address || "",
        city: (data as any)?.pickup_city || "",
        state: (data as any)?.pickup_state || "",
        pincode: (data as any)?.pickup_pincode || "",
      };

      setGateAddress(current);
      setPendingCallback(() => onReady);
      setGateMode(isAddressComplete(current) ? "confirm" : "collect");
      setGateOpen(true);
    },
    [userId]
  );

  // Naya address save karne ke liye (pehli baar), ya "Edit" se badalne ke liye.
  const saveAddress = useCallback(
    async (next: AddressForm) => {
      if (!userId) return;
      if (!isAddressComplete(next)) {
        toast.error("Sahi address bharo (naam, phone, address, city, state, 6-digit pincode)");
        return;
      }
      setGateSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          pickup_name: next.name.trim(),
          pickup_phone: next.phone.trim(),
          pickup_address: next.address.trim(),
          pickup_city: next.city.trim(),
          pickup_state: next.state.trim(),
          pickup_pincode: next.pincode.trim(),
        } as any)
        .eq("user_id", userId);
      setGateSaving(false);
      if (error) {
        toast.error("Address save nahi hua, dobara try karo");
        return;
      }
      setGateAddress(next);
      setGateOpen(false);
      toast.success("Address saved ✅");
      pendingCallback?.();
    },
    [userId, pendingCallback]
  );

  // "Confirm & Continue" — jab address already sahi hai, bas aage badho.
  const confirmAddress = useCallback(() => {
    setGateOpen(false);
    pendingCallback?.();
  }, [pendingCallback]);

  return {
    gateOpen,
    setGateOpen,
    gateMode,
    gateAddress,
    gateSaving,
    requestAddress,
    saveAddress,
    confirmAddress,
  };
}
