import { motion } from "framer-motion";
import { Briefcase, Clock, Star, MessageCircle, Loader2 } from "@/components/icons/FontAwesomeIcons";
import { BottomNav } from "@/components/ui/BottomNav";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingModal } from "@/components/ui/RatingModal";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
import { useUserRole } from "@/hooks/useUserRole";
import { useConversations } from "@/hooks/useConversations";
import { format } from "date-fns";

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  description: string | null;
  price: number | null;
  created_at: string;
  professional_id: string;
  professionals: {
    hourly_rate: number;
    profiles: {
      full_name: string | null;
    } | null;
  } | null;
  services: {
    name: string;
  } | null;
}

const BookingsPage = () => {
  const navigate = useNavigate();
  const { userType } = useUserRole();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const { getOrCreateConversationForBooking } = useConversations();
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);
  useCustomerNotifications();

  const handleOpenChat = async (bookingId: string) => {
    if (openingChatId) return;
    setOpeningChatId(bookingId);
    try {
      const conversationId = await getOrCreateConversationForBooking(bookingId);
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } finally {
      setOpeningChatId(null);
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          payment_status,
          description,
          price,
          created_at,
          professional_id,
          professionals (
            hourly_rate,
            profiles!professionals_profile_id_fkey (full_name)
          ),
          services (name)
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getStatusType = (status: string): "requested" | "accepted" | "rejected" | "in_progress" | "completed" | "rated" => {
    switch (status) {
      case "requested": return "requested";
      case "accepted":
      case "confirmed": return "accepted";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 glass border-b border-border safe-top"
      >
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground">{bookings.length} total</p>
        </div>
      </motion.header>

      <main className="container py-6">
        {bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Bookings Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Find a worker and book your first service
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/search")}
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-semibold haptic"
            >
              Find Workers
            </motion.button>
          </motion.div>
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-foreground">
                      {booking.services?.name || "Service"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      with {booking.professionals?.profiles?.full_name || "Worker"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={getStatusType(booking.status)} size="sm" />
                    {booking.payment_status === "paid" && (
                      <StatusBadge status="paid" size="sm" />
                    )}
                    {booking.payment_status === "unpaid" && ["completed", "rated"].includes(booking.status) && (
                      <StatusBadge status="unpaid" size="sm" />
                    )}
                  </div>
                </div>
                {booking.description && (
                  <p className="text-sm text-muted-foreground mb-3 p-3 bg-muted rounded-xl">
                    "{booking.description}"
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(booking.created_at), "MMM d, yyyy")}
                  </div>
                  <div className="price-tag text-sm">
                    Rs {booking.price || booking.professionals?.hourly_rate || "TBD"}
                  </div>
                </div>

                {["confirmed", "in_progress", "completed", "rated"].includes(booking.status) && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOpenChat(booking.id)}
                    disabled={openingChatId === booking.id}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-muted text-foreground rounded-xl font-semibold text-sm haptic disabled:opacity-60"
                  >
                    {openingChatId === booking.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                    Chat with {booking.professionals?.profiles?.full_name || "Worker"}
                  </motion.button>
                )}

                {/* Rate button for completed bookings */}
                {booking.status === "completed" && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRatingBooking(booking)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent rounded-xl font-semibold text-sm haptic"
                  >
                    <Star className="w-4 h-4 fill-accent" />
                    Rate This Service
                  </motion.button>
                )}

                {booking.status === "rated" && (
                  <div className="mt-4 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    You rated this service
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Rating Modal */}
      {ratingBooking && (
        <RatingModal
          isOpen={!!ratingBooking}
          onClose={() => setRatingBooking(null)}
          onSubmit={() => {
            setRatingBooking(null);
            fetchBookings();
          }}
          bookingId={ratingBooking.id}
          professionalId={ratingBooking.professional_id}
          professionalName={ratingBooking.professionals?.profiles?.full_name || "Worker"}
          serviceName={ratingBooking.services?.name || "Service"}
        />
      )}

      <BottomNav userType={userType || "customer"} />
    </div>
  );
};

export default BookingsPage;
