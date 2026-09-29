import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Loader2, Pencil } from "lucide-react";
import type { AddressForm } from "@/hooks/useAddressGate";

interface AddressGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "collect" | "confirm";
  address: AddressForm;
  saving: boolean;
  title?: string;
  helperText?: string;
  onSave: (address: AddressForm) => void;
  onConfirm: () => void;
}

const inputClass =
  "w-full glass-card border border-border/50 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30";

// Ek hi component — Buy Now, Sell Now, Rent Now teeno isi se address collect/confirm
// karwate hain. "collect" mode mein khali form dikhta hai, "confirm" mode mein
// already-saved address dikhta hai jise ek tap mein confirm ya edit kiya ja sakta hai.
const AddressGateDialog = ({
  open,
  onOpenChange,
  mode,
  address,
  saving,
  title = "Your Address",
  helperText = "Ye address is order ke liye use hoga. Baad mein bhi edit kar sakte ho.",
  onSave,
  onConfirm,
}: AddressGateDialogProps) => {
  const [form, setForm] = useState<AddressForm>(address);
  const [editing, setEditing] = useState(mode === "collect");

  useEffect(() => {
    setForm(address);
    setEditing(mode === "collect");
  }, [address, mode, open]);

  const showForm = mode === "collect" || editing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-secondary" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {!showForm && (
            <>
              <p className="text-xs text-muted-foreground">{helperText}</p>
              <div className="glass-card rounded-xl p-3 border border-border/30 space-y-1 text-sm">
                <p className="font-semibold text-foreground">{address.name}</p>
                <p className="text-muted-foreground">{address.phone}</p>
                <p className="text-muted-foreground">{address.address}</p>
                <p className="text-muted-foreground">
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 py-3 glass-card border-2 border-primary text-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Confirm & Continue
                </button>
              </div>
            </>
          )}

          {showForm && (
            <>
              <p className="text-xs text-muted-foreground">{helperText}</p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className={inputClass}
              />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone number"
                className={inputClass}
              />
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House no, gali, area, landmark"
                className={`${inputClass} resize-none`}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="City"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="State"
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                placeholder="Pincode (6 digit)"
                className={inputClass}
              />
              <button
                onClick={() => onSave(form)}
                disabled={saving}
                className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" /> Save & Continue
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressGateDialog;
