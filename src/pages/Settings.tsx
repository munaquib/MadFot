import { useState } from "react";
import { ArrowLeft, User, Bell, Lock, Palette, Globe, Trash2, ChevronRight, Check, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage, availableLanguages } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, langName, setLanguage, langCode } = useLanguage();

  const [showLangDialog, setShowLangDialog] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const handleLanguageChange = (lang: typeof availableLanguages[0]) => {
    setLanguage(lang.code, lang.name);
    setShowLangDialog(false);
    toast.success(`Language changed to ${lang.name} / ${lang.native}`);
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setShowPrivacy(false);
    }
  };

  const settingSections = [
    { icon: User, label: t("editProfile"), desc: t("namePhotoLocation"), action: () => navigate("/edit-profile") },
    { icon: Bell, label: t("notifications"), desc: t("pushAlerts"), action: () => navigate("/notifications") },
    { icon: Lock, label: t("privacySecurity"), desc: t("passwordTwoFA"), action: () => setShowPrivacy(true) },
    { icon: Palette, label: t("appearance"), desc: t("themeFontSize"), action: () => setShowAppearance(true) },
    { icon: Globe, label: t("language"), desc: langName, action: () => setShowLangDialog(true) },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">{t("settings")}</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl shadow-card border border-border/30 overflow-hidden">
            {settingSections.map((item) => (
              <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-all duration-200 border-b border-border/20 last:border-b-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <button onClick={() => setShowDeleteConfirm(true)} className="w-full mt-4 py-3 glass-card border border-destructive/30 text-destructive rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-destructive/5 transition-all duration-200">
            <Trash2 className="w-4 h-4" /> {t("deleteAccount")}
          </button>
        </div>
      </div>

      {/* Language Dialog */}
      <Dialog open={showLangDialog} onOpenChange={setShowLangDialog}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("selectLanguage")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {availableLanguages.map((lang) => (
              <button key={lang.code} onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${langCode === lang.code ? "bg-secondary/10 text-secondary font-semibold" : "hover:bg-muted/50 text-foreground"}`}>
                <span>{lang.name} <span className="text-muted-foreground ml-1">({lang.native})</span></span>
                {langCode === lang.code && <Check className="w-4 h-4 text-secondary" />}
              </button>
            ))}
            
          </div>
        </DialogContent>
      </Dialog>

      {/* Appearance Dialog — REAL Dark Mode */}
      <Dialog open={showAppearance} onOpenChange={setShowAppearance}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("appearance")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("themePreference")}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setTheme("light"); toast.success("Light mode enabled"); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-secondary bg-secondary/5" : "border-border/50 hover:bg-muted/30"}`}>
                <Sun className={`w-6 h-6 ${theme === "light" ? "text-secondary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === "light" ? "text-foreground" : "text-muted-foreground"}`}>{t("light")}</span>
              </button>
              <button
                onClick={() => { setTheme("dark"); toast.success("Dark mode enabled"); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-secondary bg-secondary/10" : "border-border/50 hover:bg-muted/30"}`}>
                <Moon className={`w-6 h-6 ${theme === "dark" ? "text-secondary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${theme === "dark" ? "text-foreground" : "text-muted-foreground"}`}>{t("dark")}</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("privacySecurity")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">{t("changePassword")}</p>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("newPassword")} className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            <button onClick={handleChangePassword} disabled={changingPass} className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50">
              {changingPass ? t("updating") : t("updatePassword")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">{t("deleteAccount")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteConfirm")}</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors">{t("cancel")}</button>
            <button onClick={() => { toast.error("Contact support@madfot.com to delete your account."); setShowDeleteConfirm(false); }} className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:opacity-90">{t("delete")}</button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Settings;
