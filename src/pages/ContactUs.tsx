import { ArrowLeft, Mail, MessageCircle, Clock, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const ContactUs = () => {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    window.open("https://wa.me/919999999999?text=Hi%20MadFod%20Support%2C%20I%20need%20help%20with...", "_blank");
  };

  const handleEmail = () => {
    window.open("mailto:support@madfod.com?subject=Support Request", "_blank");
  };

  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <h1 className="text-secondary font-bold text-lg font-serif">Contact Us</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        <p className="text-sm text-muted-foreground">We're here to help! Reach out to us through any of the channels below.</p>

        {/* Contact Options */}
        <div className="space-y-3">
          <button
            onClick={handleWhatsApp}
            className="w-full glass-card rounded-2xl p-4 border border-border/30 shadow-card flex items-center gap-4 hover:shadow-luxury transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#25D366" }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">WhatsApp Support</p>
              <p className="text-xs text-muted-foreground">Chat with us on WhatsApp</p>
              <p className="text-xs text-secondary font-semibold mt-0.5">+91 99999 99999</p>
            </div>
          </button>

          <button
            onClick={handleEmail}
            className="w-full glass-card rounded-2xl p-4 border border-border/30 shadow-card flex items-center gap-4 hover:shadow-luxury transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-secondary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Email Support</p>
              <p className="text-xs text-muted-foreground">Send us an email anytime</p>
              <p className="text-xs text-secondary font-semibold mt-0.5">support@madfod.com</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/help")}
            className="w-full glass-card rounded-2xl p-4 border border-border/30 shadow-card flex items-center gap-4 hover:shadow-luxury transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-6 h-6 text-secondary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">Help & FAQ</p>
              <p className="text-xs text-muted-foreground">Find answers to common questions</p>
            </div>
          </button>
        </div>

        {/* Support Hours */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-secondary" />
            <h3 className="font-bold text-foreground text-sm font-serif">Support Hours</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Monday – Friday</span>
              <span className="font-semibold text-foreground">9:00 AM – 7:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Saturday</span>
              <span className="font-semibold text-foreground">10:00 AM – 5:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Sunday</span>
              <span className="font-semibold text-foreground">Closed</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">We typically respond within 24 hours.</p>
      </div>
    </AppLayout>
  );
};

export default ContactUs;
