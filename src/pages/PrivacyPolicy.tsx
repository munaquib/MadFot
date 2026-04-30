import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const sections = [
  {
    title: "Information We Collect",
    content: "We collect information you provide when you register, such as your name, email address, phone number, and profile photo. We also collect information about your listings, purchases, and interactions on the platform."
  },
  {
    title: "How We Use Your Information",
    content: "We use your information to provide and improve our services, process transactions, send notifications about your listings and purchases, and ensure the safety of our platform. We do not sell your personal data to third parties."
  },
  {
    title: "Information Sharing",
    content: "We share your information only with other users as necessary for transactions (e.g., sharing your name with a buyer/seller), and with service providers like Razorpay for payment processing. We never sell your data."
  },
  {
    title: "Data Security",
    content: "We use industry-standard security measures to protect your data, including encrypted connections (HTTPS) and secure storage. Payments are processed by Razorpay, a PCI-DSS compliant payment gateway."
  },
  {
    title: "Cookies",
    content: "We use cookies to keep you logged in and improve your experience. You can disable cookies in your browser settings, but some features may not work properly."
  },
  {
    title: "Your Rights",
    content: "You have the right to access, update, or delete your personal information at any time from your Profile settings. You may also contact us at support@madfod.com to request data deletion."
  },
  {
    title: "Children's Privacy",
    content: "MadFod is not intended for users under 18 years of age. We do not knowingly collect personal information from minors."
  },
  {
    title: "Changes to This Policy",
    content: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification."
  },
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <AppLayout>
      <div className="gradient-primary px-4 py-5 rounded-b-[2rem] flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-secondary" /></button>
        <Shield className="w-5 h-5 text-secondary" />
        <h1 className="text-secondary font-bold text-lg font-serif">Privacy Policy</h1>
      </div>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <p className="text-xs text-muted-foreground">Last updated: January 2026</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          At MadFod, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information.
        </p>
        {sections.map((s) => (
          <div key={s.title} className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
            <h3 className="font-bold text-foreground text-sm font-serif mb-2">{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.content}</p>
          </div>
        ))}
        <p className="text-center text-xs text-muted-foreground pb-4">© 2026 MadFod. All rights reserved.</p>
      </div>
    </AppLayout>
  );
};

export default PrivacyPolicy;
