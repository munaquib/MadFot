import { useState } from "react";
import { ArrowLeft, User, Bell, Lock, Palette, Globe, Trash2, ChevronRight, Search, Check, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const allLanguages = [
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "ks", name: "Kashmiri", native: "कॉशुर" },
  { code: "doi", name: "Dogri", native: "डोगरी" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "mni", name: "Manipuri", native: "মৈতৈলোন্" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "bo", name: "Bodo", native: "बड़ो" },
  { code: "en", name: "English", native: "English" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", name: "Thai", native: "ภาษาไทย" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "da", name: "Danish", native: "Dansk" },
];

// Simple translations for key UI elements
const translations: Record<string, Record<string, string>> = {
  en: { home: "Home", search: "Search", sell: "Sell", wishlist: "Wishlist", chat: "Chat", notifications: "Notifications", profile: "Profile", shopNow: "Shop Now" },
  hi: { home: "होम", search: "खोजें", sell: "बेचें", wishlist: "पसंदीदा", chat: "चैट", notifications: "सूचनाएं", profile: "प्रोफ़ाइल", shopNow: "अभी खरीदें" },
  bn: { home: "হোম", search: "খুঁজুন", sell: "বিক্রি", wishlist: "পছন্দের", chat: "চ্যাট", notifications: "বিজ্ঞপ্তি", profile: "প্রোফাইল", shopNow: "এখনই কিনুন" },
  ta: { home: "முகப்பு", search: "தேடு", sell: "விற்கவும்", wishlist: "விருப்பங்கள்", chat: "அரட்டை", notifications: "அறிவிப்புகள்", profile: "சுயவிவரம்", shopNow: "இப்போது வாங்கவும்" },
  te: { home: "హోమ్", search: "వెతుకు", sell: "అమ్ము", wishlist: "కోరికలు", chat: "చాట్", notifications: "నోటిఫికేషన్లు", profile: "ప్రొఫైల్", shopNow: "ఇప్పుడే కొనండి" },
  gu: { home: "હોમ", search: "શોધો", sell: "વેચો", wishlist: "પ્રિય", chat: "ચેટ", notifications: "સૂચનાઓ", profile: "પ્રોફાઇલ", shopNow: "હવે ખરીદો" },
  mr: { home: "होम", search: "शोधा", sell: "विका", wishlist: "आवडते", chat: "चॅट", notifications: "सूचना", profile: "प्रोफाइल", shopNow: "आता खरेदी करा" },
  pa: { home: "ਹੋਮ", search: "ਖੋਜੋ", sell: "ਵੇਚੋ", wishlist: "ਮਨਪਸੰਦ", chat: "ਚੈਟ", notifications: "ਸੂਚਨਾਵਾਂ", profile: "ਪ੍ਰੋਫਾਈਲ", shopNow: "ਹੁਣੇ ਖਰੀਦੋ" },
  ur: { home: "ہوم", search: "تلاش", sell: "بیچیں", wishlist: "پسندیدہ", chat: "چیٹ", notifications: "اطلاعات", profile: "پروفائل", shopNow: "ابھی خریدیں" },
};

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showLangDialog, setShowLangDialog] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [selectedLang, setSelectedLang] = useState(() => localStorage.getItem("madfot_lang_name") || "English");
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const filteredLangs = allLanguages.filter(
    (l) => l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.native.includes(langSearch)
  );

  const handleLanguageChange = (lang: typeof allLanguages[0]) => {
    setSelectedLang(lang.name);
    localStorage.setItem("madfot_lang_code", lang.code);
    localStorage.setItem("madfot_lang_name", lang.name);
    // Apply lang attribute to document
    document.documentElement.lang = lang.code;
    // RTL support
    if (["ar", "ur", "fa", "he", "sd"].includes(lang.code)) {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
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
    { icon: User, label: "Edit Profile", desc: "Name, photo, location", action: () => navigate("/edit-profile") },
    { icon: Bell, label: "Notifications", desc: "Push, email, SMS alerts", action: () => navigate("/notifications") },
    { icon: Lock, label: "Privacy & Security", desc: "Password, 2FA, blocked users", action: () => setShowPrivacy(true) },
    { icon: Palette, label: "Appearance", desc: "Theme, font size", action: () => setShowAppearance(true) },
    { icon: Globe, label: "Language", desc: selectedLang, action: () => setShowLangDialog(true) },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">Settings</h1>
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
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Language Dialog */}
      <Dialog open={showLangDialog} onOpenChange={setShowLangDialog}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">Select Language ({allLanguages.length} available)</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={langSearch} onChange={(e) => setLangSearch(e.target.value)} placeholder="Search language..." className="w-full bg-muted/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredLangs.map((lang) => (
              <button key={lang.code} onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedLang === lang.name ? "bg-secondary/10 text-secondary font-semibold" : "hover:bg-muted/50 text-foreground"}`}>
                <span>{lang.name} <span className="text-muted-foreground ml-1">({lang.native})</span></span>
                {selectedLang === lang.name && <Check className="w-4 h-4 text-secondary" />}
              </button>
            ))}
            {filteredLangs.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No language found</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Appearance Dialog */}
      <Dialog open={showAppearance} onOpenChange={setShowAppearance}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Appearance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Theme preference</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-secondary bg-secondary/5">
                <Sun className="w-6 h-6 text-secondary" />
                <span className="text-sm font-medium text-foreground">Light</span>
              </button>
              <button onClick={() => toast.info("Dark mode coming soon!")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                <Moon className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Dark</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Privacy & Security</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Change Password</p>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            <button onClick={handleChangePassword} disabled={changingPass} className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50">
              {changingPass ? "Updating..." : "Update Password"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-destructive">Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure? This action cannot be undone.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors">Cancel</button>
            <button onClick={() => { toast.error("Contact support@madfot.com to delete your account."); setShowDeleteConfirm(false); }} className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:opacity-90">Delete</button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Settings;
