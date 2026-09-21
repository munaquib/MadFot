import { useState } from "react";
import { ArrowLeft, MapPinned, Search, Package, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

type TrackActivity = {
  date: string | null;
  status: string;
  location: string;
  activity: string;
};

type TrackResult = {
  order_id?: string;
  product_title?: string;
  status: string;
  courier_name: string | null;
  awb_code?: string;
  activities: TrackActivity[];
};

const TrackOrder = () => {
  const navigate = useNavigate();
  const [awbInput, setAwbInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const awb = awbInput.trim();
    if (!awb) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("shiprocket-track", {
        body: { awb_code: awb },
      });

      if (fnError) {
        setError("Kuch gadbad ho gayi. Thodi der baad try karo.");
      } else if ((data as any)?.error) {
        const msg = (data as any).error;
        if (msg === "Order not found") {
          setError("Ye AWB number kisi order se match nahi hua. Number dobara check karo.");
        } else if (msg === "Not allowed") {
          setError("Ye order tumhara nahi hai, isliye tracking nahi dikha sakte.");
        } else {
          setError("Tracking fetch nahi ho payi. Thodi der baad try karo.");
        }
      } else {
        setResult(data as TrackResult);
      }
    } catch (err) {
      console.error("Track order error:", err);
      setError("Kuch gadbad ho gayi. Thodi der baad try karo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 pt-6 pb-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-all duration-200">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg md:text-xl font-bold text-foreground font-serif">Track Order</h1>
        </div>

        {/* Search box */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 border border-border/30 shadow-card mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPinned className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-foreground font-serif">Enter AWB Number</h3>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={awbInput}
              onChange={(e) => setAwbInput(e.target.value)}
              placeholder="e.g. 71234567890"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
            <button
              type="submit"
              disabled={loading || !awbInput.trim()}
              className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2">AWB number tumhare order ki delivery details mein milega, jaise hi order ship hota hai.</p>
        </motion.div>

        {/* Result / error / empty states */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-4 border border-border/30 shadow-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Fetching tracking details…</div>
            ) : error ? (
              <div className="py-6 text-center">
                <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            ) : result ? (
              <div>
                {result.product_title && (
                  <p className="text-sm font-semibold text-foreground mb-1">{result.product_title}</p>
                )}
                {result.courier_name && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Courier: <span className="font-semibold text-foreground">{result.courier_name}</span>
                    {result.awb_code && <span className="ml-1">• AWB: {result.awb_code}</span>}
                  </p>
                )}

                {result.status === "not_shipped_yet" ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">Ye order abhi tak ship nahi hua hai. Pickup hote hi yahan tracking dikhegi.</p>
                  </div>
                ) : result.activities.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">Courier ne abhi tak koi update nahi bheja hai. Thodi der mein dobara check karo.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {result.activities.map((act, idx) => {
                      const isLatest = idx === 0;
                      const isLast = idx === result.activities.length - 1;
                      return (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isLatest ? "bg-secondary ring-4 ring-secondary/15" : "bg-border"}`} />
                            {!isLast && <div className="w-0.5 flex-1 bg-border/70 my-0.5" style={{ minHeight: "28px" }} />}
                          </div>
                          <div className={`pb-4 flex-1 min-w-0 ${isLatest ? "" : "opacity-70"}`}>
                            <p className={`text-xs font-semibold ${isLatest ? "text-foreground" : "text-muted-foreground"}`}>{act.activity || act.status}</p>
                            {act.location && <p className="text-[10px] text-muted-foreground mt-0.5">{act.location}</p>}
                            {act.date && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                {new Date(act.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default TrackOrder;
