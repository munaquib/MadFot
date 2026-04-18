import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setAvatarUrl(data.avatar_url || null);
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
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      phone,
      location,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
      navigate("/settings");
    }
  };

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

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
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="Enter your full name" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone Number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-card border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" placeholder="City, State" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <input value={user?.email || ""} disabled className="w-full bg-muted/50 border border-border/30 rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
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
