import { ArrowLeft, RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const ReturnsPolicy = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <RotateCcw className="w-5 h-5 text-secondary" />
        <h1 className="text-secondary font-bold text-lg font-serif">Returns Policy</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <p className="text-xs text-muted-foreground">Last updated: January 2026</p>

        {/* Main Policy */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-2">Our Return Policy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            MadFod is a peer-to-peer marketplace. Returns are accepted within <span className="font-semibold text-foreground">3 days</span> of delivery if the item is significantly different from the listing description or is damaged/defective.
          </p>
        </div>

        {/* Eligible Returns */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm font-serif">Eligible for Return</h3>
          </div>
          <ul className="space-y-2">
            {[
              "Item received is significantly different from listing photos",
              "Item has undisclosed damage or defects",
              "Wrong item delivered",
              "Item is not authentic as claimed",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Not Eligible */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-destructive" />
            <h3 className="font-bold text-foreground text-sm font-serif">Not Eligible for Return</h3>
          </div>
          <ul className="space-y-2">
            {[
              "Change of mind after purchase",
              "Minor colour variation due to photography lighting",
              "Return request after 3 days of delivery",
              "Items that have been used or washed after delivery",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* How to Return */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-secondary" />
            <h3 className="font-bold text-foreground text-sm font-serif">How to Raise a Return Request</h3>
          </div>
          <ol className="space-y-2">
            {[
              "Take clear photos of the item showing the issue",
              "Contact us via WhatsApp or email within 3 days",
              "Our team will review your request within 24 hours",
              "If approved, refund will be processed within 5-7 business days",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary text-secondary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={() => navigate("/contact")}
          className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          Contact Support for Returns
        </button>

        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 MadFod. All rights reserved.</p>
      </div>
    </AppLayout>
  );
};

export default ReturnsPolicy;
