import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, User, Briefcase, Clock, MapPin, DollarSign } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";

interface Booking {
  id: string;
  status: string;
  description: string | null;
  price: number | null;
  created_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  professionals: {
    id: string;
    hourly_rate: number;
    profiles: {
      full_name: string | null;
      phone: string;
    } | null;
  } | null;
  services: {
    name: string;
  } | null;
}

type StatusFilter = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

export const AdminBookings = ({ isAdmin }: { isAdmin: boolean }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const fetchBookings = async () => {
    if (!isAdmin) return;
    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          professionals (
            id,
            hourly_rate,
            profiles!professionals_profile_id_fkey (full_name, phone)
          ),
          services (name)
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filter, isAdmin]);

  if (!isAdmin) return null;

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "requested", label: "Requested" },
    { id: "accepted", label: "Accepted" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const getStatusType = (status: string): "requested" | "accepted" | "rejected" | "in_progress" | "completed" | "rated" => {
    switch (status) {
      case "requested": return "requested";
      case "accepted": return "accepted";
      case "rejected":
      case "cancelled": return "rejected";
      case "in_progress": return "in_progress";
      case "completed": return "completed";
      case "rated": return "rated";
      default: return "requested";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 w-40 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {filters.map((f) => (
          <motion.button
            key={f.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors haptic ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-card"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-foreground">
                    {booking.services?.name || "Service"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    #{booking.id.slice(0, 8)}
                  </p>
                </div>
                <StatusBadge status={getStatusType(booking.status)} size="sm" />
              </div>

              {/* Description */}
              {booking.description && (
                <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-xl">
                  "{booking.description}"
                </p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    {booking.professionals?.profiles?.full_name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-secondary" />
                  <span className="text-muted-foreground">
                    {format(new Date(booking.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-info" />
                  <span className="text-muted-foreground">
                    {format(new Date(booking.created_at), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="text-muted-foreground">
                    Rs {booking.price || booking.professionals?.hourly_rate || "TBD"}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs text-muted-foreground">Created</span>
                </div>
                {booking.status !== "requested" && (
                  <>
                    <div className="flex-1 h-0.5 bg-muted" />
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        booking.status === "cancelled" || booking.status === "rejected" 
                          ? "bg-destructive" 
                          : "bg-info"
                      }`} />
                      <span className="text-xs text-muted-foreground capitalize">{booking.status}</span>
                    </div>
                  </>
                )}
                {booking.completed_at && (
                  <>
                    <div className="flex-1 h-0.5 bg-success" />
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-xs text-muted-foreground">Done</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
