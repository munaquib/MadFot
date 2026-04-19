import { useState } from "react";
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
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

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
    if (error) toast.error(error.message);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: "url('/login-bg.png')",
      backgroundSize: "cover", backgroundPosition: "center",
      display: "flex", zIndex: 9999
    }}>
      {/* Left half - empty, shows background */}
      <div style={{ flex: 1 }} />

      {/* Right half - login card centered */}
      <div style={{
        width: "50%", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "24px"
      }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: "rgba(248, 244, 237, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "20px", padding: "36px",
            width: "100%", maxWidth: "400px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
          }}>

          {mode !== "main" && (
            <button onClick={() => setMode("main")} style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "13px", color: "#999", marginBottom: "20px",
              background: "none", border: "none", cursor: "pointer", padding: 0
            }}>
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {mode === "main" && (
            <>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px", fontFamily: "Georgia, serif" }}>
                Welcome to MadFot
              </h2>
              <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px", margin: "0 0 28px 0" }}>
                Login or create account
              </p>

              {/* Google Button - Golden */}
              <button onClick={handleGoogleLogin} disabled={loading} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                background: "linear-gradient(to right, #c9a227, #e0b94a, #c9a227)",
                border: "none", borderRadius: "50px", padding: "14px 20px",
                fontSize: "15px", fontWeight: 600, color: "#1a1a1a",
                cursor: "pointer", marginBottom: "16px", boxShadow: "0 2px 8px rgba(201,162,39,0.3)"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#1a1a1a" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#1a1a1a" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#1a1a1a" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#1a1a1a" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* OR divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0 16px" }}>
                <div style={{ flex: 1, height: "1px", background: "#e0d8cc" }} />
                <span style={{ fontSize: "12px", color: "#bbb", fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: "#e0d8cc" }} />
              </div>

              {/* Email Button - Outline */}
              <button onClick={() => setMode("email")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                background: "transparent", border: "1.5px solid #1a3a2a",
                borderRadius: "50px", padding: "14px 20px",
                fontSize: "15px", fontWeight: 600, color: "#1a3a2a",
                cursor: "pointer", marginBottom: "20px"
              }}>
                <Mail size={16} />
                Continue with Email
              </button>

              {/* Browse as Guest */}
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <button onClick={() => navigate("/")} style={{
                  background: "none", border: "none", fontSize: "14px",
                  color: "#c9a227", cursor: "pointer", fontWeight: 500
                }}>
                  Browse as Guest →
                </button>
              </div>

              {/* Sign Up */}
              <p style={{ textAlign: "center", fontSize: "13px", color: "#666", margin: 0 }}>
                Don't have an account?{" "}
                <Link to="/signup" style={{ color: "#c9a227", fontWeight: 600, textDecoration: "none" }}>
                  Sign Up
                </Link>
              </p>
            </>
          )}

          {mode === "email" && (
            <>
              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px", fontFamily: "Georgia, serif" }}>
                Login with Email
              </h2>
              <p style={{ fontSize: "14px", color: "#888", marginBottom: "24px" }}>
                Enter your email and password
              </p>
              <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                  <input type="email" placeholder="Email address" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    style={{ width: "100%", background: "rgba(255,255,255,0.8)", border: "1px solid #e0d8cc", borderRadius: "12px", padding: "13px 14px 13px 40px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    style={{ width: "100%", background: "rgba(255,255,255,0.8)", border: "1px solid #e0d8cc", borderRadius: "12px", padding: "13px 40px 13px 40px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: "100%", background: "linear-gradient(to right, #c9a227, #e0b94a, #c9a227)",
                  border: "none", borderRadius: "50px", padding: "14px",
                  fontSize: "15px", fontWeight: 700, color: "#1a1a1a",
                  cursor: "pointer", opacity: loading ? 0.7 : 1, marginTop: "4px"
                }}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
