import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const translations: Record<string, Record<string, string>> = {
  en: {
    home: "Home", search: "Search", sell: "Sell", wishlist: "Wishlist",
    chat: "Chat", notifications: "Notifications", profile: "Profile",
    shopNow: "Shop Now", settings: "Settings", logout: "Logout",
    login: "Login", signup: "Sign Up", loading: "Loading...",
    welcome: "Welcome to MadFot", loginOrCreate: "Login or create account",
    continueGoogle: "Continue with Google", continueEmail: "Continue with Email",
    browseGuest: "Browse as Guest →", noAccount: "Don't have an account?",
    loginEmail: "Login with Email", enterEmail: "Enter your email and password",
    emailAddress: "Email address", password: "Password", loggingIn: "Logging in...",
    editProfile: "Edit Profile", namePhotoLocation: "Name, photo, location",
    pushAlerts: "Push, email, SMS alerts", privacySecurity: "Privacy & Security",
    passwordTwoFA: "Password, 2FA, blocked users", appearance: "Appearance",
    themeFontSize: "Theme, font size", language: "Language",
    deleteAccount: "Delete Account", selectLanguage: "Select Language",
    searchLanguage: "Search language...", themePreference: "Theme preference",
    light: "Light", dark: "Dark", changePassword: "Change Password",
    newPassword: "New password (min 6 chars)", updatePassword: "Update Password",
    updating: "Updating...", cancel: "Cancel", delete: "Delete",
    deleteConfirm: "Are you sure? This action cannot be undone.",
  },
  hi: {
    home: "होम", search: "खोजें", sell: "बेचें", wishlist: "पसंदीदा",
    chat: "चैट", notifications: "सूचनाएं", profile: "प्रोफ़ाइल",
    shopNow: "अभी खरीदें", settings: "सेटिंग्स", logout: "लॉग आउट",
    login: "लॉगिन", signup: "साइन अप", loading: "लोड हो रहा है...",
    welcome: "MadFot में आपका स्वागत है", loginOrCreate: "लॉगिन या नया खाता बनाएं",
    continueGoogle: "Google से जारी रखें", continueEmail: "Email से जारी रखें",
    browseGuest: "मेहमान के रूप में ब्राउज़ करें →", noAccount: "खाता नहीं है?",
    loginEmail: "Email से लॉगिन", enterEmail: "अपना ईमेल और पासवर्ड दर्ज करें",
    emailAddress: "ईमेल पता", password: "पासवर्ड", loggingIn: "लॉगिन हो रहा है...",
    editProfile: "प्रोफ़ाइल संपादित करें", namePhotoLocation: "नाम, फोटो, स्थान",
    pushAlerts: "पुश, ईमेल, SMS सूचनाएं", privacySecurity: "गोपनीयता और सुरक्षा",
    passwordTwoFA: "पासवर्ड, 2FA, ब्लॉक उपयोगकर्ता", appearance: "रूप-रंग",
    themeFontSize: "थीम, फ़ॉन्ट आकार", language: "भाषा",
    deleteAccount: "खाता हटाएं", selectLanguage: "भाषा चुनें",
    searchLanguage: "भाषा खोजें...", themePreference: "थीम प्राथमिकता",
    light: "लाइट", dark: "डार्क", changePassword: "पासवर्ड बदलें",
    newPassword: "नया पासवर्ड (कम से कम 6 अक्षर)", updatePassword: "पासवर्ड अपडेट करें",
    updating: "अपडेट हो रहा है...", cancel: "रद्द करें", delete: "हटाएं",
    deleteConfirm: "क्या आप सुनिश्चित हैं? इस क्रिया को पूर्ववत नहीं किया जा सकता।",
  },
  // Hinglish — Roman script Hindi mixed with English
  hinglish: {
    home: "Home", search: "Dhundho", sell: "Becho", wishlist: "Pasandida",
    chat: "Baat Karo", notifications: "Notifications", profile: "Profile",
    shopNow: "Abhi Kharido", settings: "Settings", logout: "Log Out",
    login: "Login", signup: "Sign Up", loading: "Load ho raha hai...",
    welcome: "MadFot pe Aapka Swagat Hai", loginOrCreate: "Login karo ya naya account banao",
    continueGoogle: "Google se Continue Karo", continueEmail: "Email se Continue Karo",
    browseGuest: "Guest ke roop mein Browse Karo →", noAccount: "Account nahi hai?",
    loginEmail: "Email se Login Karo", enterEmail: "Apna email aur password daalo",
    emailAddress: "Email Address", password: "Password", loggingIn: "Login ho raha hai...",
    editProfile: "Profile Edit Karo", namePhotoLocation: "Naam, photo, jagah",
    pushAlerts: "Push, email, SMS alerts", privacySecurity: "Privacy & Security",
    passwordTwoFA: "Password, 2FA, blocked users", appearance: "Look & Feel",
    themeFontSize: "Theme, font size", language: "Bhasha",
    deleteAccount: "Account Delete Karo", selectLanguage: "Bhasha Chuno",
    searchLanguage: "Bhasha search karo...", themePreference: "Theme preference",
    light: "Light", dark: "Dark", changePassword: "Password Badlo",
    newPassword: "Naya password (kam se kam 6 characters)", updatePassword: "Password Update Karo",
    updating: "Update ho raha hai...", cancel: "Cancel", delete: "Delete Karo",
    deleteConfirm: "Pakka karna chahte ho? Yeh action wapas nahi hoga.",
  },
};

// Only 3 languages
export const availableLanguages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "hinglish", name: "Hinglish", native: "Hinglish" },
];

interface LanguageContextType {
  langCode: string;
  langName: string;
  t: (key: string) => string;
  setLanguage: (code: string, name: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [langCode, setLangCode] = useState(() => localStorage.getItem("madfot_lang_code") || "en");
  const [langName, setLangName] = useState(() => localStorage.getItem("madfot_lang_name") || "English");

  const setLanguage = (code: string, name: string) => {
    setLangCode(code);
    setLangName(name);
    localStorage.setItem("madfot_lang_code", code);
    localStorage.setItem("madfot_lang_name", name);
    document.documentElement.lang = code === "hinglish" ? "hi-Latn" : code;
    document.documentElement.dir = "ltr";
  };

  const t = (key: string): string => {
    const dict = translations[langCode] || translations["en"];
    return dict[key] || translations["en"][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = langCode === "hinglish" ? "hi-Latn" : langCode;
  }, []);

  return (
    <LanguageContext.Provider value={{ langCode, langName, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
