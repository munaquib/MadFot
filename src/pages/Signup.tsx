import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) { toast.error(error.message); } else { toast.success("Account created! Check your email to verify 📧"); navigate("/login"); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--gradient-bg)" }}>
      <div className="gradient-primary px-6 pt-16 pb-12 rounded-b-[3rem] text-center lg:rounded-none lg:w-1/2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:pb-16">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-3 rounded-2xl gradient-hero flex items-center justify-center shadow-card">
            <Crown className="w-8 h-8 lg:w-10 lg:h-10 text-secondary-foreground" />
          </div>
          <h1 className="text-2xl lg:text-4xl font-extrabold text-secondary font-serif">MadFod</h1>
          <p className="text-secondary/60 text-sm lg:text-base mt-1">Join the Fashion Revolution</p>
          <p className="hidden lg:block text-secondary/40 text-sm mt-4 max-w-xs mx-auto">Sell your premium pre-owned outfits and earn money. Join the MadFod community today!</p>
        </motion.div>
      </div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex-1 px-6 -mt-6 lg:mt-0 lg:flex lg:items-center lg:justify-center"
      >
        <div className="glass-card rounded-3xl p-6 md:p-8 shadow-card border border-border/30 w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1 font-serif">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-6">Start buying & selling fashion</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                className="w-full bg-muted/50 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-muted/50 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-muted/50 rounded-xl py-3 pl-10 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary text-secondary font-bold py-3 rounded-xl shadow-card disabled:opacity-50 transition-all duration-200 hover:opacity-90">
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-secondary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
