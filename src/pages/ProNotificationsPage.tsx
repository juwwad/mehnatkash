import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Briefcase, CheckCircle2, Clock } from "@/components/icons/FontAwesomeIcons";
import { BottomNav } from "@/components/ui/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: "new_booking" | "booking_update";
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

const ProNotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch recent bookings as "notifications"
      const { data: profRow } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profRow) { setLoading(false); return; }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, created_at, services(name)")
        .eq("professional_id", profRow.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const mapped: Notification[] = (bookings || []).map((b: any) => ({
        id: b.id,
        type: b.status === "pending" ? "new_booking" : "booking_update",
        title: b.status === "pending" ? "New job request" : `Booking ${b.status}`,
        body: `${b.services?.name ?? "Service"} — ${b.status}`,
        created_at: b.created_at,
        read: b.status !== "pending",
      }));

      setNotifications(mapped);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
      </header>

      <main className="container py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-sm">Job requests and updates will appear here.</p>
          </motion.div>
        ) : (
          notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate("/pro/dashboard")}
              className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer haptic transition-colors ${
                n.read ? "bg-card" : "bg-primary/5 border border-primary/20"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                n.type === "new_booking" ? "bg-primary/10" : "bg-success/10"
              }`}>
                {n.type === "new_booking"
                  ? <Briefcase className="w-5 h-5 text-primary" />
                  : <CheckCircle2 className="w-5 h-5 text-success" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{n.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 truncate">{n.body}</p>
                <p className="text-muted-foreground text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
              )}
            </motion.div>
          ))
        )}
      </main>

      <BottomNav userType="professional" />
    </div>
  );
};

export default ProNotificationsPage;
