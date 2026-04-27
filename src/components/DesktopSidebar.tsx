import { Home, Search, PlusCircle, Bell, User, MessageCircle, Heart, Crown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: PlusCircle, label: "Sell", path: "/sell" },
  { icon: Heart, label: "Wishlist", path: "/wishlist" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface DesktopSidebarProps {
  open: boolean;
  onToggle: () => void;
}

const DesktopSidebar = ({ open, onToggle }: DesktopSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside
      className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-primary z-40 transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo + Close */}
      <div className="px-6 py-6 flex items-center justify-between border-b border-secondary/10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shadow-card">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-secondary font-serif">MadFod</h1>
        </div>
        <button onClick={onToggle} className="text-secondary/60 hover:text-secondary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-1 pt-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-secondary/15 text-secondary shadow-sm"
                  : "text-secondary/50 hover:bg-secondary/8 hover:text-secondary/80"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-secondary" : ""}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 text-secondary/30 text-xs border-t border-secondary/10">
        © 2026 MadFod
      </div>
    </aside>
  );
};

export default DesktopSidebar;
