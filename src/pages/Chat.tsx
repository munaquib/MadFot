import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCheck } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  product_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  user_id: string;
  full_name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  product_id?: string;
}

const formatTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sellerIdParam = searchParams.get("seller_id");
  const productIdParam = searchParams.get("product_id");
  const offerParam = searchParams.get("offer");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (sellerIdParam && user) {
      fetchSellerAndOpen(sellerIdParam);
    }
  }, [sellerIdParam, user]);

  const fetchSellerAndOpen = async (sellerId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, user_id")
      .eq("user_id", sellerId)
      .single();
    if (data) {
      const name = data.full_name || "Seller";
      const conv: Conversation = {
        user_id: data.user_id,
        full_name: name,
        avatar: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        lastMsg: "",
        time: "now",
        unread: 0,
        online: false,
        product_id: productIdParam || undefined,
      };
      openChat(conv);
      if (offerParam) {
        setTimeout(() => sendSpecialMessage(
          sellerId,
          `💰 I'd like to make an offer of ₹${Number(offerParam).toLocaleString("en-IN")} for this item.`,
          productIdParam || undefined
        ), 800);
      }
    }
  };

  const sendSpecialMessage = async (receiverId: string, content: string, productId?: string) => {
    if (!user) return;
    const { data } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      product_id: productId || null,
      content,
    }).select().single();
    if (data) setMessages(prev => [...prev, data]);
  };

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!msgs || msgs.length === 0) { setLoading(false); return; }

    const convMap = new Map<string, any>();
    msgs.forEach((m: any) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          user_id: otherId,
          lastMsg: m.content,
          time: formatTime(m.created_at),
          unread: (!m.is_read && m.receiver_id === user.id) ? 1 : 0,
          product_id: m.product_id,
        });
      }
    });

    const userIds = Array.from(convMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const convList: Conversation[] = userIds.map(uid => {
      const prof = profiles?.find((p: any) => p.user_id === uid);
      const name = prof?.full_name || "User";
      const d = convMap.get(uid);
      return {
        ...d,
        full_name: name,
        avatar: name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
        online: false,
      };
    });

    setConversations(convList);
    setLoading(false);
  };

  const openChat = async (conv: Conversation) => {
    setActiveChat(conv);
    if (!user) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${conv.user_id}),and(sender_id.eq.${conv.user_id},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("sender_id", conv.user_id);

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase
      .channel(`chat-${[user.id, conv.user_id].sort().join("-")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload: any) => {
        const newMsg = payload.new as Message;
        const isRelevant =
          (newMsg.sender_id === user.id && newMsg.receiver_id === conv.user_id) ||
          (newMsg.sender_id === conv.user_id && newMsg.receiver_id === user.id);
        if (isRelevant) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.receiver_id === user.id) {
            supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
          }
        }
      })
      .subscribe();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !activeChat || !user) return;
    const content = message.trim();
    setMessage("");

    const { data, error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeChat.user_id,
      product_id: activeChat.product_id || null,
      content,
    }).select().single();

    if (error) { toast.error("Failed to send message"); setMessage(content); return; }
    if (data) setMessages(prev => [...prev, data]);
  };

  if (activeChat) {
    return (
      <AppLayout>
        <div className="flex flex-col h-[calc(100vh-120px)]">
          <div className="gradient-primary px-4 py-3 flex items-center gap-3 rounded-b-2xl">
            <button onClick={() => { setActiveChat(null); if (channelRef.current) supabase.removeChannel(channelRef.current); fetchConversations(); }} className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-secondary" />
            </button>
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
              {activeChat.avatar}
            </div>
            <div>
              <p className="text-secondary font-semibold text-sm">{activeChat.full_name}</p>
              <p className="text-secondary/50 text-[10px]">Active</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Start the conversation! 👋</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.sender_id === user?.id ? "bg-primary text-secondary" : "bg-muted text-foreground"}`}>
                  {msg.content}
                  <div className={`flex items-center gap-1 mt-0.5 ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <span className="text-[9px] opacity-60">{formatTime(msg.created_at)}</span>
                    {msg.sender_id === user?.id && (
                      <CheckCheck className={`w-3 h-3 ${msg.is_read ? "opacity-100" : "opacity-40"}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 pb-4 flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-card border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
            />
            <button onClick={sendMessage} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center hover:opacity-90 transition-all">
              <Send className="w-4 h-4 text-secondary" />
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="gradient-primary px-4 md:px-6 py-5 rounded-b-[2rem]">
        <h1 className="text-secondary font-bold text-lg font-serif">Messages</h1>
        <p className="text-secondary/60 text-xs">{conversations.length} conversations</p>
      </div>

      <div className="px-4 md:px-6 py-4 space-y-2 max-w-3xl">
        {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
        {!loading && conversations.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No conversations yet. Start chatting with a seller! 💬</p>
        )}
        {conversations.map((conv, i) => (
          <motion.div
            key={conv.user_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => openChat(conv)}
            className="glass-card rounded-2xl p-3 md:p-4 shadow-card flex items-center gap-3 border border-border/30 cursor-pointer hover:shadow-luxury transition-all duration-300"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-secondary font-bold text-sm">
                {conv.avatar}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{conv.full_name}</p>
                <span className="text-[10px] text-muted-foreground">{conv.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{conv.lastMsg}</p>
            </div>
            {conv.unread > 0 && (
              <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-[10px] text-secondary-foreground font-bold">{conv.unread}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </AppLayout>
  );
};

export default Chat;
