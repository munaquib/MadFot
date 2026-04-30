import { ArrowLeft, Camera, IndianRupee, Star, Truck, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const steps = [
  { icon: Camera, title: "Take Photos", desc: "Click clear photos of your outfit — front, back and details. Good photos = faster sale!" },
  { icon: CheckCircle, title: "Create Listing", desc: "Fill in title, price, condition, size and category. Takes less than 2 minutes!" },
  { icon: Star, title: "Get Verified", desc: "Our team verifies your listing to build buyer trust and boost visibility." },
  { icon: IndianRupee, title: "Earn Money", desc: "When a buyer purchases, payment is securely transferred to your account." },
];

const tips = [
  "Use natural light for photos",
  "Set a competitive price (check similar listings)",
  "Write an honest, detailed description",
  "Mention any flaws clearly to avoid returns",
  "Respond to buyer messages quickly",
  "Keep your seller rating high for more sales",
];

const SellWithUs = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <h1 className="text-secondary font-bold text-lg font-serif">Sell With Us</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">

        {/* Hero */}
        <div className="glass-card rounded-2xl p-5 border border-border/30 shadow-card text-center">
          <p className="text-2xl font-extrabold text-secondary font-serif">Earn from Your Wardrobe!</p>
          <p className="text-sm text-muted-foreground mt-1">Turn your pre-loved ethnic fashion into cash. Listing is free!</p>
          <button
            onClick={() => navigate("/sell")}
            className="mt-4 w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all"
          >
            👗 Start Selling Now — It's Free!
          </button>
        </div>

        {/* How it works */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-4">How It Works</h3>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <step.icon className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-secondary bg-primary/10 px-1.5 py-0.5 rounded-full">Step {i + 1}</span>
                    <p className="text-sm font-bold text-foreground">{step.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Sell */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-3">Why Sell on MadFod?</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: "🆓", title: "Free Listing", desc: "No fees to list your product" },
              { emoji: "🔒", title: "Secure Payment", desc: "Get paid safely via Razorpay" },
              { emoji: "📦", title: "Delivery Support", desc: "Offer delivery to more buyers" },
              { emoji: "⭐", title: "Build Reputation", desc: "Get reviews & sell more" },
            ].map((item) => (
              <div key={item.title} className="bg-muted/50 rounded-xl p-3">
                <span className="text-xl">{item.emoji}</span>
                <p className="text-xs font-bold text-foreground mt-1">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-3">Tips for Faster Sales</h3>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => navigate("/sell")}
          className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          👗 Start Selling Now
        </button>

        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 MadFod. All rights reserved.</p>
      </div>
    </AppLayout>
  );
};

export default SellWithUs;
