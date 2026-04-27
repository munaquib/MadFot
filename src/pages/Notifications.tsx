import { useState, useEffect } from "react";
import { Bell, CheckCheck, Package, MessageCircle, Heart, Tag } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const typeIcons: Record<string, typeof Bell> = {
  general: Bell, message: MessageCircle, wishlist: Heart, order: Package, price_drop: Tag,
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Real-time notifications
    const channel = supabase.channel("notifications:" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + user.id },
        (payload) => {
          const n = payload.new as Tables<"notifications">;
          setNotifications((prev) => [n, ...prev]);
          // Show browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(n.title || "MadFod", { body: n.message || "", icon: "/icon-192x192.png" });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 pt-5 pb-6 rounded-b-[2rem] lg:rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-secondary font-bold text-lg md:text-xl font-serif">Notifications</h1>
            <p className="text-secondary/60 text-xs md:text-sm">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 bg-secondary/10 px-3 py-1.5 rounded-full hover:bg-secondary/20 transition-all duration-200">
              <CheckCheck className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs text-secondary font-medium">Mark all read</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 max-w-3xl">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">We'll notify you about updates here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif, i) => {
              const Icon = typeIcons[notif.type || "general"] || Bell;
              return (
                <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className={`glass-card rounded-2xl p-3.5 shadow-card border cursor-pointer transition-all duration-200 ${notif.is_read ? "border-border/20 opacity-70" : "border-secondary/20 bg-secondary/5"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${notif.is_read ? "bg-muted" : "bg-primary"}`}>
                      <Icon className={`w-4 h-4 ${notif.is_read ? "text-muted-foreground" : "text-secondary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(notif.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 mt-2" />}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
