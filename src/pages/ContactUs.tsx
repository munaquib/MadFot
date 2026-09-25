import { useState, useEffect } from "react";
import { ArrowLeft, Mail, MessageCircle, Clock, HelpCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

const ContactUs = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (user) fetchMyTickets();
  }, [user]);

  const fetchMyTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, admin_reply, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setMyTickets((data as Ticket[]) || []);
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/919229539743?text=Hi%20MadFod%20Support%2C%20I%20need%20help%20with...", "_blank");
  };

  const handleEmail = () => {
    window.open("mailto:support.madfod@gmail.com?subject=Support Request", "_blank");
  };

  const handleSubmitTicket = async () => {
    if (!user) {
      toast.error("Please login to send a message");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject aur message dono bharo");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
    });
    if (error) {
      toast.error("Failed to send, try again");
      setSubmitting(false);
      return;
    }
    toast.success("Message bhej diya! Hum jaldi reply karenge ✅");
    setSubject("");
    setMessage("");
    setSubmitting(false);
    fetchMyTickets();
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
              <p className="text-xs text-secondary font-semibold mt-0.5">+91 92295 39743</p>
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
              <p className="text-xs text-secondary font-semibold mt-0.5">support.madfod@gmail.com</p>
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

        {/* Send us a message form */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground text-sm font-serif mb-3">Send us a message</h3>
          {!user ? (
            <p className="text-xs text-muted-foreground">Please login to send us a message directly.</p>
          ) : (
            <>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject (e.g. Order issue)"
                maxLength={100}
                className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground mb-2 outline-none"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Apni problem yahan likhein..."
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-xl bg-muted text-sm text-foreground mb-3 outline-none resize-none"
              />
              <button
                onClick={handleSubmitTicket}
                disabled={submitting}
                className="w-full py-2.5 bg-primary text-secondary rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </>
          )}
        </div>

        {/* My previous tickets */}
        {user && myTickets.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-foreground text-sm font-serif">Your Messages</h3>
            {myTickets.map((t) => (
              <div key={t.id} className="glass-card rounded-2xl p-3 border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-foreground">{t.subject}</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.status === "resolved" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
                    {t.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t.message}</p>
                {t.admin_reply && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-[10px] font-semibold text-foreground">Support reply:</p>
                    <p className="text-[11px] text-muted-foreground">{t.admin_reply}</p>
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(t.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

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
