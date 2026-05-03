import { Home, ShoppingCart, PlusCircle, User, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: ShoppingCart, label: "Cart", path: "/wishlist" },
  { icon: PlusCircle, label: "Sell", path: "/sell" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav shadow-nav rounded-t-2xl border-t border-border/50">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive ? "text-secondary" : "text-muted-foreground hover:text-secondary"
              }`}
            >
              {item.label === "Sell" ? (
                <div className="gradient-primary rounded-full p-2.5 -mt-5 shadow-card border-4 border-card">
                  <item.icon className="w-6 h-6 text-secondary" />
                </div>
              ) : (
                <item.icon className={`w-5 h-5 ${isActive ? "text-secondary" : ""}`} />
              )}
              <span className={`text-[10px] font-medium ${isActive ? "text-secondary" : ""}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
