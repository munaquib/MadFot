import { useState } from "react";
import { ArrowLeft, HelpCircle, MessageCircle, Mail, FileText, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const faqs = [
  { q: "How do I list a product for sale?", a: "Go to the Sell page from the bottom navigation, fill in product details, upload photos, and tap 'List Product'." },
  { q: "How do I verify my account?", a: "Go to Profile → Verify Account. Upload your ID proof and selfie for verification." },
  { q: "What payment methods are supported?", a: "We support UPI, debit/credit cards, net banking, and wallets through Razorpay." },
  { q: "How does shipping work?", a: "Once a buyer purchases your item, you'll receive shipping instructions. Pack the item and drop it at the nearest courier partner." },
  { q: "Can I return a product?", a: "Yes, returns are accepted within 7 days if the item doesn't match the listing description." },
  { q: "How do I contact a seller?", a: "Use the Chat button on the product detail page to message the seller directly." },
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showFaqs, setShowFaqs] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [reportText, setReportText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const openWhatsAppChat = () => {
    window.open("https://wa.me/919229539743?text=Hi%20MadFod%20Support%2C%20I%20need%20help%20with...", "_blank");
  };

  const submitReport = async () => {
    if (!reportText.trim()) return;
    if (!user) {
      toast.error("Please login to submit a report");
      return;
    }
    setSubmittingReport(true);
    const { error } = await supabase.from("feedback_reports").insert({
      user_id: user.id,
      message: reportText.trim(),
    } as any);
    setSubmittingReport(false);
    if (error) {
      toast.error("Failed to submit report. Please try again.");
      return;
    }
    toast.success("Report submitted! We'll look into it. 🙏");
    setReportText("");
    setShowReport(false);
  };

  const helpItems = [
    { icon: FileText, label: "FAQs", desc: "Common questions answered", action: () => setShowFaqs(true) },
    { icon: MessageCircle, label: "Live Chat", desc: "Chat with us on WhatsApp", action: openWhatsAppChat },
    { icon: Mail, label: "Email Us", desc: "support.madfod@gmail.com", action: () => { window.location.href = "mailto:support.madfod@gmail.com"; } },
    { icon: HelpCircle, label: "Report a Problem", desc: "Bug reports & feedback", action: () => setShowReport(true) },
  ];

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">Help & Support</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-2xl shadow-card border border-border/30 overflow-hidden">
            {helpItems.map((item) => (
              <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-all duration-200 border-b border-border/20 last:border-b-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQs Dialog */}
      <Dialog open={showFaqs} onOpenChange={setShowFaqs}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Frequently Asked Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border/30 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                  <span className="text-left">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-muted-foreground">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Report a Problem</DialogTitle>
          </DialogHeader>
          <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Describe the issue or share your feedback..." rows={5} className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none" />
          <button onClick={submitReport} disabled={submittingReport || !reportText.trim()} className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submittingReport ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Report"}
          </button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default HelpSupport;
