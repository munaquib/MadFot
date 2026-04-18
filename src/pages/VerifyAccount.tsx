import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Shield, CheckCircle, Upload, BadgeCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VerifyAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [isVerified, setIsVerified] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    checkStatus();
  }, [user]);

  const checkStatus = async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", user.id)
      .single();
    if ((prof as any)?.is_verified) { setIsVerified(true); setLoading(false); return; }

    const { data: req } = await supabase
      .from("verification_requests")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (req) setRequestStatus(req.status);
    setLoading(false);
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${user!.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verifications").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("verifications").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Please login first"); return; }
    if (!idProofFile) { toast.error("Please upload ID proof"); return; }
    if (!selfieFile) { toast.error("Please upload a selfie"); return; }
    setSubmitting(true);
    try {
      const idUrl = await uploadFile(idProofFile, "id-proofs");
      const selfieUrl = await uploadFile(selfieFile, "selfies");
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        id_proof_url: idUrl,
        selfie_url: selfieUrl,
        status: "pending",
      });
      if (error) throw error;
      setRequestStatus("pending");
      toast.success("Verification request submitted! We'll review within 24 hours. ✅");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification");
    }
    setSubmitting(false);
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground font-serif">Verify Account</h1>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          {/* Header card */}
          <div className="glass-card rounded-2xl p-5 border border-border/30 shadow-card text-center">
            {isVerified ? (
              <>
                <BadgeCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h2 className="text-base font-bold text-foreground font-serif">You're Verified! 🎉</h2>
                <p className="text-xs text-muted-foreground mt-1">Your account has the verified seller badge.</p>
              </>
            ) : requestStatus === "pending" ? (
              <>
                <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                <h2 className="text-base font-bold text-foreground font-serif">Under Review</h2>
                <p className="text-xs text-muted-foreground mt-1">Your verification is being reviewed. Usually takes 24 hours.</p>
              </>
            ) : requestStatus === "rejected" ? (
              <>
                <Shield className="w-12 h-12 text-destructive mx-auto mb-2" />
                <h2 className="text-base font-bold text-foreground font-serif">Verification Rejected</h2>
                <p className="text-xs text-muted-foreground mt-1">Please re-submit with clearer documents.</p>
              </>
            ) : (
              <>
                <Shield className="w-12 h-12 text-secondary mx-auto mb-2" />
                <h2 className="text-base font-bold text-foreground font-serif">Get Verified</h2>
                <p className="text-xs text-muted-foreground mt-1">Verified sellers get 3x more buyers and a badge on their profile!</p>
              </>
            )}
          </div>

          {/* Benefits */}
          {!isVerified && (
            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-2">
              <p className="text-xs font-bold text-foreground mb-2">Why get verified?</p>
              {["✅ Verified badge on your profile", "✅ Higher visibility in search", "✅ Build buyer trust", "✅ Access to premium features"].map(b => (
                <p key={b} className="text-xs text-muted-foreground">{b}</p>
              ))}
            </div>
          )}

          {/* Upload form — only show if not verified and not pending */}
          {!isVerified && requestStatus !== "pending" && (
            <div className="glass-card rounded-2xl p-4 border border-border/30 space-y-4">
              <p className="text-sm font-bold text-foreground font-serif">Upload Documents</p>

              {/* ID Proof */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Government ID (Aadhaar/PAN/Passport)</p>
                <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={e => setIdProofFile(e.target.files?.[0] || null)} />
                <button onClick={() => idInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-border/50 rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 hover:border-secondary/50 hover:text-secondary transition-all">
                  <Upload className="w-4 h-4" />
                  {idProofFile ? idProofFile.name : "Upload ID Proof"}
                </button>
                {idProofFile && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Selected</p>}
              </div>

              {/* Selfie */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Selfie with ID</p>
                <input ref={selfieInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
                <button onClick={() => selfieInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-border/50 rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 hover:border-secondary/50 hover:text-secondary transition-all">
                  <Upload className="w-4 h-4" />
                  {selfieFile ? selfieFile.name : "Take Selfie with ID"}
                </button>
                {selfieFile && <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Selected</p>}
              </div>

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit for Verification"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default VerifyAccount;
