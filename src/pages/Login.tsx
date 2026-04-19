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
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: "url('/login-bg.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      display: "flex",
      zIndex: 9999
    }}>
      <div style={{ flex: 1 }} />
      <div style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: "rgba(245,240,232,0.93)",
            backdropFilter: "blur(8px)",
            borderRadius: "24px",
            padding: "32px",
            width: "100%",
            maxWidth: "380px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
          }}>

          {mode !== "main" && (
            <button onClick={() => setMode("main")} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#888", marginBottom: "16px", background: "none", border: "none", cursor: "pointer" }}>
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {mode === "main" && (
            <>
              <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#1a2e1a", marginBottom: "4px", fontFamily: "serif" }}>Welcome to MadFot</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "24px" }}>Login or create account</p>

              <button onClick={handleGoogleLogin} disabled={loading} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                background: "linear-gradient(135deg, #b8922a, #d4a843, #c9a030)",
                border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px",
                fontWeight: 600, color: "#1a2e1a", cursor: "pointer", marginBottom: "12px"
              }}>
                <img src="https://www.google.com/favicon.ico" style={{ width: "18px", height: "18px" }} alt="G" />
                Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "8px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(139,115,85,0.3)" }} />
                <span style={{ fontSize: "11px", color: "#aaa" }}>OR</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(139,115,85,0.3)" }} />
              </div>

              <button onClick={() => setMode("email")} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                background: "transparent", border: "1.5px solid #1a3a2a",
                borderRadius: "12px", padding: "13px", fontSize: "14px",
                fontWeight: 600, color: "#1a3a2a", cursor: "pointer", marginBottom: "16px"
              }}>
                <Mail size={16} />
                Continue with Email
              </button>

              <button onClick={() => navigate("/")} style={{
                width: "100%", background: "none", border: "none", padding: "8px",
                fontSize: "13px", color: "#c9a030", cursor: "pointer", marginBottom: "8px"
              }}>
                Browse as Guest →
              </button>

              <p style={{ textAlign: "center", fontSize: "12px", color: "#888" }}>
                Don't have an account?{" "}
                <Link to="/signup" style={{ color: "#c9a030", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
              </p>
            </>
          )}

          {mode === "email" && (
            <>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a2e1a", marginBottom: "4px", fontFamily: "serif" }}>Login with Email</h2>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>Enter your email and password</p>
              <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                  <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
                    style={{ width: "100%", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "12px", padding: "12px 12px 12px 38px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    style={{ width: "100%", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "12px", padding: "12px 40px 12px 38px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888" }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: "100%", background: "linear-gradient(135deg, #b8922a, #d4a843, #c9a030)",
                  border: "none", borderRadius: "12px", padding: "13px", fontSize: "14px",
                  fontWeight: 700, color: "#1a2e1a", cursor: "pointer", opacity: loading ? 0.6 : 1
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
