import { ArrowLeft, Crown, Heart, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const AboutUs = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <h1 className="text-secondary font-bold text-lg font-serif">About Us</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Logo & Tagline */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-luxury">
            <Crown className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground font-serif">MadFod</h2>
          <p className="text-sm text-muted-foreground">India's Premium Pre-Loved Fashion Marketplace</p>
        </div>

        {/* Our Story */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground font-serif mb-2 text-base">Our Story</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MadFod was born from a simple idea — beautiful ethnic fashion should not be worn just once and forgotten. We created a trusted platform where people across India can buy and sell pre-loved lehengas, sherwanis, sarees, gowns, and more at a fraction of the original price.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Whether you have a stunning bridal lehenga sitting in your wardrobe or are looking for an affordable designer outfit for a special occasion, MadFod connects buyers and sellers in a safe, verified environment.
          </p>
        </div>

        {/* Mission */}
        <div className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
          <h3 className="font-bold text-foreground font-serif mb-3 text-base">Our Mission</h3>
          <div className="space-y-3">
            {[
              { icon: Heart, title: "Make Fashion Accessible", desc: "Premium ethnic wear at up to 80% off original prices." },
              { icon: Shield, title: "Build Trust", desc: "Every seller is verified. Every product is authentic." },
              { icon: Users, title: "Grow Community", desc: "Connecting fashion lovers across India." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "500+", label: "Products Listed" },
            { value: "100%", label: "Authentic" },
            { value: "4.8★", label: "User Rating" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-3 text-center border border-border/30 shadow-card">
              <p className="text-lg font-extrabold text-secondary">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 MadFod. Made with ❤️ in India</p>
      </div>
    </AppLayout>
  );
};

export default AboutUs;
