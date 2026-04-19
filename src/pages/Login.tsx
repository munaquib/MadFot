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
    else { toast.success("Welcome back! 🎉"); navigate("/"); }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row" style={{ backgroundImage: `url('/login-bg.png')`, backgroundSize: "cover", backgroundPosition: "center" }}>

      {/* Left side — transparent overlay on image */}
      <div className="hidden lg:flex lg:w-1/2" />

      {/* Right side — login card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="lg:w-1/2 w-full flex items-center justify-center px-6 py-12"
      >
        <div className="rounded-3xl p-8 shadow-xl w-full max-w-md overflow-hidden" style={{ background: "rgba(245,240,232,0.92)", backdropFilter: "blur(8px)" }}>

          {mode !== "main" && (
            <button onClick={() => setMode("main")} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {mode === "main" && (
            <>
              <h2 className="text-2xl font-bold text-foreground mb-1 font-serif">Welcome to MadFot</h2>
              <p className="text-sm text-muted-foreground mb-6">Login or create account</p>

              <div className="space-y-3">
                {/* Google — Golden */}
                <button onClick={handleGoogleLogin} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, #b8922a, #d4a843, #c9a030)", color: "#1a2e1a" }}>
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(139,115,85,0.3)" }} />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(139,115,85,0.3)" }} />
                </div>

                {/* Email — Outline */}
                <button onClick={() => setMode("email")}
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all bg-transparent"
                  style={{ border: "1.5px solid #1a3a2a", color: "#1a3a2a" }}>
                  <Mail className="w-4 h-4" />
                  Continue with Email
                </button>

                {/* Guest */}
                <button onClick={() => navigate("/")}
                  className="w-full py-3 text-sm transition-colors"
                  style={{ color: "#c9a030" }}>
                  Browse as Guest →
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link to="/signup" style={{ color: "#c9a030" }} className="font-semibold hover:underline">Sign Up</Link>
              </p>
            </>
          )}

          {mode === "email" && (
            <>
              <h2 className="text-xl font-bold text-foreground mb-1 font-serif">Login with Email</h2>
              <p className="text-sm text-muted-foreground mb-6">Enter your email and password</p>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full bg-white/70 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2" style={{ border: "1px solid rgba(139,115,85,0.3)" }} />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full bg-white/70 rounded-xl py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-2" style={{ border: "1px solid rgba(139,115,85,0.3)" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full font-bold py-3 rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #b8922a, #d4a843, #c9a030)", color: "#1a2e1a" }}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default Login;


