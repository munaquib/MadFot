import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// Detect if running inside a WebView / Android APK
const isWebView = (): boolean => {
  const ua = navigator.userAgent;
  // Android WebView has "wv" in user agent or lacks "Chrome/" standalone
  return /wv/.test(ua) || (
    /Android/.test(ua) &&
    !/Chrome\/\d/.test(ua)
  ) || window.matchMedia("(display-mode: standalone)").matches;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    // When running as a PWA/APK (standalone mode), we must NOT redirect to an
    // external browser. Instead we use skipBrowserRedirect and open the URL
    // ourselves inside the same window — this keeps the user inside the app.
    const inApp = isWebView();

    if (inApp) {
      // Use PKCE flow: get the URL, then navigate in the same tab
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error: error as Error };
      if (data?.url) {
        // Navigate in the same window — stays inside the app/WebView
        window.location.href = data.url;
      }
      return { error: null };
    } else {
      // Normal web browser — standard redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      return { error: error as Error | null };
    }
  };

  const signInWithPhone = async (phone: string) => {
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatted,
    });
    return { error: error as Error | null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const formatted = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token,
      type: "sms",
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithPhone, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
