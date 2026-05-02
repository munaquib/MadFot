import React, { createContext, useContext, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: "618115455469-dngo03b6681obtl2b5nvprvhfpbfglln.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });
    }

    // Load cached session instantly so app opens fast
    // But only if we are NOT on the login page
    try {
      const isLoginPage = window.location.pathname === "/login";
      if (!isLoginPage) {
        const cached = localStorage.getItem("madfod_session");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.user) {
            setUser(parsed.user);
            setSession(parsed);
            setLoading(false);
          }
        }
      }
    } catch {}

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Cache session for instant load next time
      try {
        if (session) {
          localStorage.setItem("madfod_session", JSON.stringify(session));
        } else {
          localStorage.removeItem("madfod_session");
        }
      } catch {}
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      try {
        if (session) {
          localStorage.setItem("madfod_session", JSON.stringify(session));
        } else {
          localStorage.removeItem("madfod_session");
        }
      } catch {}
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication.idToken;
        const accessToken = googleUser.authentication.accessToken; // ✅ add kiya

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          access_token: accessToken, // ✅ add kiya
        });

        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }

        return { error };
      } catch (error) {
        return { error };
      }
    }

    // Clear cache so home page doesn't flash during Google redirect
    try { localStorage.removeItem("madfod_session"); } catch {}
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://madfod.com/",
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    return { error };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: "sms",
    });
    return { error };
  };

  const signOut = async () => {
    try { localStorage.removeItem("madfod_session"); } catch {}
    await supabase.auth.signOut();
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, signInWithPhone, verifyOtp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
