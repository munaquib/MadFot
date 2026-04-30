import { ArrowLeft, CreditCard, Shield, Lock, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const PaymentInfo = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <CreditCard className="w-5 h-5 text-secondary" />
        <h1 className="text-secondary font-bold text-lg font-serif">Payment Info</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {/* Powered by Razorpay */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-2">Powered by Razorpay</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All payments on MadFod are securely processed by <span className="font-semibold text-foreground">Razorpay</span> — India's most trusted payment gateway. Your card and bank details are never stored on our servers.
          </p>
        </div>

        {/* Accepted Payment Methods */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-3">Accepted Payment Methods</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: CreditCard, label: "Credit Card", desc: "Visa, Mastercard, Amex" },
              { icon: CreditCard, label: "Debit Card", desc: "All major Indian banks" },
              { icon: Smartphone, label: "UPI", desc: "GPay, PhonePe, Paytm" },
              { icon: Smartphone, label: "Net Banking", desc: "All major banks" },
            ].map((m) => (
              <div key={m.label} className="bg-muted/50 rounded-xl p-3 flex items-start gap-2">
                <m.icon className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm font-serif">100% Secure Payments</h3>
          </div>
          <ul className="space-y-2">
            {[
              "256-bit SSL encryption on all transactions",
              "PCI-DSS compliant payment processing",
              "Your card details are never stored",
              "3D Secure authentication for extra safety",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Refunds */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-2">Refund Timeline</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>UPI / Net Banking</span>
              <span className="font-semibold text-foreground">1–3 business days</span>
            </div>
            <div className="flex justify-between">
              <span>Credit / Debit Card</span>
              <span className="font-semibold text-foreground">5–7 business days</span>
            </div>
            <div className="flex justify-between">
              <span>Wallet</span>
              <span className="font-semibold text-foreground">1–2 business days</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/contact")}
          className="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm hover:opacity-90 transition-all"
        >
          Contact Support for Payment Issues
        </button>

        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 MadFod. All rights reserved.</p>
      </div>
    </AppLayout>
  );
};

export default PaymentInfo;
