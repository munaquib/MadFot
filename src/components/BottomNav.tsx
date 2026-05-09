import { useState, useEffect } from "react";
import { Home, ShoppingCart, PlusCircle, User, MessageCircle, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch unread notifications count
    const fetchNotifs = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadNotifs(count || 0);
    };

    // Fetch unread messages count
    const fetchChats = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setUnreadChats(count || 0);
    };

    fetchNotifs();
    fetchChats();

    // Real-time: notifications change pe update
    const channel = supabase
      .channel("bottomnav-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { fetchNotifs(); }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => { fetchChats(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: ShoppingCart, label: "Wishlist", path: "/wishlist" },
    { icon: PlusCircle, label: "Sell", path: "/sell" },
    { icon: MessageCircle, label: "Chat", path: "/chat", badge: unreadChats },
    { icon: User, label: "Profile", path: "/profile" },
  ];

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
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? "text-secondary" : ""}`} />
                  {/* Chat unread badge */}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  {/* Notification dot on Profile */}
                  {item.label === "Profile" && unreadNotifs > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-secondary text-secondary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadNotifs > 99 ? "99+" : unreadNotifs}
                    </span>
                  ) : null}
                </div>
              )}
              <span className={`text-[10px] font-medium ${isActive ? "text-secondary" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
