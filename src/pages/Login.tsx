import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [mode, setMode] = useState<"main" | "email">("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) navigate("/");
  }, [user]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { toast.error(error.message); }
    else { toast.success("Welcome back!"); navigate("/"); }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      toast.error(error.message || "Google login failed");
    } else {
      navigate("/"); // ✅ Fix: Google login ke baad navigate karo
    }
  };

  // =====================
  // DESKTOP LAYOUT
  // =====================
  if (!isMobile) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: "url('/login_bg_clean.png')",
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        display: "flex", zIndex: 9999
      }}>
        <div style={{ width: "50%", height: "100%" }} />
        <div style={{
          width: "50%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px"
        }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              background: "rgba(252, 248, 242, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "44px 40px",
              width: "100%", maxWidth: "420px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
            }}
          >
            {mode !== "main" && (
              <button onClick={() => setMode("main")} style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "13px", color: "#888", marginBottom: "20px",
                background: "none", border: "none", cursor: "pointer", padding: 0
              }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {mode === "main" && (
              <>
                <h2 style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "26px", fontWeight: 700,
                  color: "#1a1a1a", margin: "0 0 6px 0"
                }}>Welcome to MadFod</h2>
                <p style={{ fontSize: "14px", color: "#888", margin: "0 0 32px 0" }}>
                  Login or create account
                </p>

                <button onClick={handleGoogleLogin} disabled={loading} style={{
                  width: "100%", height: "54px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                  background: "linear-gradient(to right, #b8960c, #d4aa20, #c9a227, #d4aa20, #b8960c)",
                  border: "none", borderRadius: "12px",
                  fontSize: "15px", fontWeight: 600, color: "#1a1a1a",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1, marginBottom: "20px",
                  boxShadow: "0 4px 15px rgba(201,162,39,0.35)"
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <button onClick={() => setMode("email")} style={{
                  width: "100%", height: "54px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
                  background: "#1e4d2f", border: "none", borderRadius: "12px",
                  fontSize: "15px", fontWeight: 600, color: "#f0d878",
                  cursor: "pointer", marginBottom: "20px"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#f0d878" strokeWidth="1.8"/><path d="M2 8 L12 14 L22 8" stroke="#f0d878" strokeWidth="1.8"/></svg>
                  Continue with Email
                </button>

                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: "14px", color: "#6a5a4a", cursor: "pointer", fontWeight: 500 }}>Browse as Guest →</button>
                </div>

                <p style={{ textAlign: "center", fontSize: "13px", color: "#888", margin: 0 }}>
                  Don't have an account?{" "}
                  <Link to="/signup" style={{ color: "#c9a227", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
                </p>
              </>
            )}

            {mode === "email" && (
              <>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: "24px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px 0" }}>Login with Email</h2>
                <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px" }}>Enter your email and password</p>
                <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                    <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
                      style={{ width: "100%", background: "rgba(255,255,255,0.9)", border: "1.5px solid #e0d8cc", borderRadius: "12px", padding: "14px 14px 14px 42px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1a1a1a" }} />
                  </div>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                      style={{ width: "100%", background: "rgba(255,255,255,0.9)", border: "1.5px solid #e0d8cc", borderRadius: "12px", padding: "14px 42px 14px 42px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1a1a1a" }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading} style={{
                    width: "100%", height: "54px",
                    background: "linear-gradient(to right, #b8960c, #d4aa20, #c9a227, #d4aa20, #b8960c)",
                    border: "none", borderRadius: "12px", fontSize: "15px", fontWeight: 700, color: "#1a1a1a",
                    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: "4px",
                    boxShadow: "0 4px 15px rgba(201,162,39,0.35)"
                  }}>{loading ? "Logging in..." : "Login"}</button>
                </form>
                <p style={{ textAlign: "center", fontSize: "13px", color: "#888", margin: "20px 0 0 0" }}>
                  Don't have an account?{" "}
                  <Link to="/signup" style={{ color: "#c9a227", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // =====================
  // MOBILE LAYOUT
  // =====================
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url('/login-bg.png')", backgroundSize: "cover", backgroundPosition: "center top", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", zIndex: 9999 }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#f0e8d8", borderRadius: "28px 28px 0 0", padding: "28px 24px 50px", overflow: "hidden", zIndex: 2 }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.1, zIndex: 1 }} viewBox="0 0 390 320" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#8a6a3a" strokeWidth="1.2" fill="none">
            <path d="M18 75 L42 58 L56 75 L70 58 L94 75 L88 145 L24 145 Z"/><path d="M42 58 Q56 70 70 58"/>
            <path d="M195 38 L210 18 L225 38 L210 68 Z"/><line x1="195" y1="38" x2="225" y2="38"/>
            <path d="M265 95 Q298 88 320 100 Q326 118 309 124 L269 124 Z"/>
            <rect x="14" y="195" width="32" height="42" rx="7"/><circle cx="30" cy="216" r="13"/>
          </g>
        </svg>
        <div style={{ position: "absolute", top: "-18px", right: "-6px", width: "130px", height: "145px", zIndex: 3, pointerEvents: "none" }}>
          <svg viewBox="0 0 130 145" xmlns="http://www.w3.org/2000/svg">
            <path d="M65 8 Q95 2 118 20 Q128 52 112 84 Q96 116 68 130 Q40 118 26 92 Q10 62 22 28 Q42 2 65 8 Z" fill="#d4b896" opacity="0.94"/>
            <path d="M65 18 Q90 13 108 28 Q116 55 102 80 Q86 106 65 116 Q44 104 34 82 Q22 56 34 30 Q50 13 65 18 Z" fill="#c4a47c" opacity="0.76"/>
            <path d="M65 30 Q84 25 97 40 Q103 60 90 77 Q76 92 65 96 Q50 88 44 70 Q38 50 50 36 Q58 24 65 30 Z" fill="#b08858" opacity="0.54"/>
            <path d="M65 44 Q78 40 87 53 Q91 67 80 77 Q70 84 65 82 Q56 77 52 65 Q49 52 58 44 Q62 40 65 44 Z" fill="#9a7040" opacity="0.38"/>
          </svg>
        </div>
        {mode !== "main" && (<button onClick={() => setMode("main")} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#8a7a6a", marginBottom: "16px", background: "none", border: "none", cursor: "pointer", padding: 0, position: "relative", zIndex: 4 }}><ArrowLeft size={14} /> Back</button>)}
        {mode === "main" && (
          <div style={{ position: "relative", zIndex: 4 }}>
            <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "23px", fontWeight: 700, color: "#1a2a1a", margin: "0 0 5px 0" }}>Welcome to MadFod</h2>
            <p style={{ fontSize: "13px", color: "#8a7a6a", margin: "0 0 24px 0" }}>Login or create account</p>
            <button onClick={handleGoogleLogin} disabled={loading} style={{ width: "100%", height: "54px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "#ffffff", border: "1.5px solid #e8e0d0", borderRadius: "14px", fontSize: "15px", fontWeight: 600, color: "#2a2a2a", cursor: "pointer", marginBottom: "12px", opacity: loading ? 0.7 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button onClick={() => setMode("email")} style={{ width: "100%", height: "54px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "#1e4d2f", border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 600, color: "#f0d878", cursor: "pointer", marginBottom: "22px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#f0d878" strokeWidth="1.8"/><path d="M2 8 L12 14 L22 8" stroke="#f0d878" strokeWidth="1.8"/></svg>
              Continue with Email
            </button>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: "14px", color: "#6a5a4a", cursor: "pointer", fontWeight: 500 }}>Browse as Guest →</button>
            </div>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#8a7a6a", margin: 0 }}>Don't have an account? <Link to="/signup" style={{ color: "#c8a830", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link></p>
          </div>
        )}
        {mode === "email" && (
          <div style={{ position: "relative", zIndex: 4 }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "22px", fontWeight: 700, color: "#1a2a1a", margin: "0 0 5px 0" }}>Login with Email</h2>
            <p style={{ fontSize: "13px", color: "#8a7a6a", margin: "0 0 22px 0" }}>Enter your email and password</p>
            <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ position: "relative" }}><Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} /><input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", background: "rgba(255,255,255,0.88)", border: "1px solid #e0d8cc", borderRadius: "12px", padding: "13px 14px 13px 42px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1a1a1a" }} /></div>
              <div style={{ position: "relative" }}><Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} /><input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", background: "rgba(255,255,255,0.88)", border: "1px solid #e0d8cc", borderRadius: "12px", padding: "13px 42px 13px 42px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#1a1a1a" }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              <button type="submit" disabled={loading} style={{ width: "100%", height: "54px", background: "#1e4d2f", border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 700, color: "#f0d878", cursor: "pointer", opacity: loading ? 0.7 : 1, marginTop: "4px" }}>{loading ? "Logging in..." : "Login"}</button>
            </form>
            <p style={{ textAlign: "center", fontSize: "13px", color: "#8a7a6a", margin: "18px 0 0 0" }}>Don't have an account? <Link to="/signup" style={{ color: "#c8a830", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
