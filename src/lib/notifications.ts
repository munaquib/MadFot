import { supabase } from "@/integrations/supabase/client";

// Save push token to DB
export const savePushToken = async (userId: string, token: string) => {
  await supabase.from("push_tokens").upsert(
    { user_id: userId, token, platform: "web" },
    { onConflict: "user_id,token" }
  );
};

// Request push notification permission
export const requestPushPermission = async (userId: string): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  // For PWA: use service worker push if available
  if ("serviceWorker" in navigator && "PushManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Store registration for later use
      (window as any).__swReg = reg;
    } catch {}
  }

  // Save a simple token (device identifier)
  const token = `web-${userId}-${Date.now()}`;
  await savePushToken(userId, token);
  return true;
};

// Show local notification (works without server)
export const showLocalNotification = (title: string, body: string, icon?: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  
  try {
    new Notification(title, {
      body,
      icon: icon || "/icon-192x192.png",
      badge: "/icon-72x72.png",
    });
  } catch {}
};

// Listen for new messages and show notification
export const setupMessageNotifications = (userId: string) => {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `receiver_id=eq.${userId}`,
    }, (payload: any) => {
      const msg = payload.new;
      showLocalNotification(
        "New Message on MadFot 💬",
        msg.content?.slice(0, 60) || "You have a new message",
        "/icon-192x192.png"
      );
    })
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "offers",
      filter: `seller_id=eq.${userId}`,
    }, (payload: any) => {
      const offer = payload.new;
      showLocalNotification(
        "New Offer Received! 💰",
        `Someone made an offer of ₹${Number(offer.offered_price).toLocaleString("en-IN")}`,
        "/icon-192x192.png"
      );
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
};
