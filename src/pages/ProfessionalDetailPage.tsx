import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Shield,
  Check,
  Zap,
  Calendar,
  MessageSquare,
  X,
} from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { RatingStars } from "@/components/ui/RatingStars";
import { toast } from "sonner";
import { z } from "zod";
import { useConversations } from "@/hooks/useConversations";

interface Professional {
  id: string;
  user_id: string;
  skills: string[];
  hourly_rate: number;
  bio: string | null;
  location_city: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  review_count: number;
  profiles: {
    full_name: string | null;
    phone: string;
    avatar_url: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
}

const bookingSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Please describe your issue (at least 10 characters)")
    .max(500, "Description must be less than 500 characters"),
});

const ProfessionalDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingError, setBookingError] = useState("");
  const { getOrCreateConversation } = useConversations();
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // Fetch professional details
        const { data: proData, error: proError } = await supabase
          .from("professionals")
          .select(`
            *,
            profiles!professionals_profile_id_fkey (full_name, phone, avatar_url),
            services (id, name, type)
          `)
          .eq("id", id)
          .maybeSingle();

        if (proError) throw proError;
        setProfessional(proData);

        // Fetch reviews
        if (proData) {
          const { data: reviewsData } = await supabase
            .from("ratings")
            .select(`
              id,
              rating,
              review,
              created_at,
              customer_id
            `)
            .eq("professional_id", id)
            .order("created_at", { ascending: false })
            .limit(10);

          // Fetch customer profiles for reviews
          if (reviewsData && reviewsData.length > 0) {
            const customerIds = reviewsData.map(r => r.customer_id);
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", customerIds);

            const reviewsWithProfiles = reviewsData.map(review => ({
              ...review,
              profiles: profilesData?.find(p => p.user_id === review.customer_id) || null
            }));

            setReviews(reviewsWithProfiles);
          }
        }
      } catch (error) {
        console.error("Error fetching professional:", error);
        toast.error("Failed to load professional details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleBooking = async () => {
    // Validate input
    const result = bookingSchema.safeParse({ description: bookingDescription });
    if (!result.success) {
      setBookingError(result.error.errors[0].message);
      return;
    }

    if (!currentUser) {
      toast.error("Please login to book a service");
      navigate("/auth");
      return;
    }

    if (!professional) return;

    setSubmitting(true);
    setBookingError("");

    try {
      const { error } = await supabase.from("bookings").insert({
        customer_id: currentUser.id,
        professional_id: professional.id,
        service_id: professional.services?.id,
        description: result.data.description,
        price: professional.hourly_rate,
        status: "requested",
      });

      if (error) throw error;

      toast.success("Booking request sent!");
      setShowBookingModal(false);
      setBookingDescription("");
      navigate("/bookings");
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Worker Not Found</h2>
        <p className="text-muted-foreground mb-4">This profile doesn't exist or has been removed</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/search")}
          className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-semibold haptic"
        >
          Browse Workers
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Photo */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-primary to-primary-glow" />
        
        {/* Back Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-lg flex items-center justify-center text-white haptic z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        {/* Profile Photo */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="w-32 h-32 rounded-full border-4 border-card bg-muted overflow-hidden shadow-elevated">
            {professional.profiles?.avatar_url ? (
              <img
                src={professional.profiles.avatar_url}
                alt={professional.profiles.full_name || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full gradient-primary flex items-center justify-center">
                <span className="text-4xl font-bold text-primary-foreground">
                  {professional.profiles?.full_name?.charAt(0) || "?"}
                </span>
              </div>
            )}
          </div>
          {professional.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-success flex items-center justify-center border-2 border-card">
              <Shield className="w-4 h-4 text-success-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="container pt-20 pb-32 space-y-6">
        {/* Name & Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {professional.profiles?.full_name || "Unknown"}
          </h1>
          <p className="text-muted-foreground mb-3">
            {professional.services?.name || "Professional"}
          </p>

          {/* Rating */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <RatingStars rating={Math.round(Number(professional.rating) || 0)} size="md" />
            <span className="font-bold text-foreground">{Number(professional.rating).toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({professional.review_count} reviews)</span>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              {professional.location_city}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
              professional.is_available ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
            }`}>
              <div className={`w-2 h-2 rounded-full ${professional.is_available ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
              {professional.is_available ? "Available" : "Busy"}
            </div>
            {professional.is_verified && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                Verified
              </div>
            )}
          </div>
        </motion.div>

        {/* Price Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hourly Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">Rs {professional.hourly_rate}</span>
                <span className="text-muted-foreground">/hr</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBookingModal(true)}
              disabled={!professional.is_available}
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 haptic shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar className="w-5 h-5" />
              Book Now
            </motion.button>
          </div>
        </motion.div>

        {/* Bio */}
        {professional.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-5 shadow-card"
          >
            <h3 className="font-bold text-foreground mb-3">About</h3>
            <p className="text-muted-foreground leading-relaxed">{professional.bio}</p>
          </motion.div>
        )}

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-5 shadow-card"
        >
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {professional.skills.length > 0 ? (
              professional.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No skills listed</p>
            )}
          </div>
        </motion.div>

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl p-5 shadow-card"
        >
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-secondary" />
            Reviews ({professional.review_count})
          </h3>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">
                        {review.profiles?.full_name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground text-sm">
                          {review.profiles?.full_name || "Customer"}
                        </span>
                        <RatingStars rating={review.rating} size="sm" />
                      </div>
                      {review.review && (
                        <p className="text-sm text-muted-foreground">{review.review}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No reviews yet. Be the first to review!
            </p>
          )}
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-card"
        >
          <h3 className="font-bold text-foreground mb-3">Contact</h3>
          <div className="space-y-3">
            <a
              href={`tel:${professional.profiles?.phone}`}
              className="flex items-center gap-3 p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{professional.profiles?.phone || "N/A"}</p>
                <p className="text-xs text-muted-foreground">Tap to call</p>
              </div>
            </a>
            <a
              href={`https://wa.me/${professional.profiles?.phone?.replace(/^0/, '92').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${professional.profiles?.full_name || ''}, I found you on Tashk Haath and would like to discuss a ${professional.services?.name || 'service'} job.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-[hsl(142,70%,45%)]/10 rounded-xl hover:bg-[hsl(142,70%,45%)]/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(142,70%,45%)]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[hsl(142,70%,45%)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[hsl(142,70%,45%)]">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Chat on WhatsApp</p>
              </div>
            </a>
          </div>
        </motion.div>
      </main>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-elevated"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Book Service</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowBookingModal(false)}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center haptic"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>

              {/* Professional Summary */}
              <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-foreground">
                    {professional.profiles?.full_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{professional.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{professional.services?.name}</p>
                </div>
                <div className="price-tag text-sm">
                  Rs {professional.hourly_rate}/hr
                </div>
              </div>

              {/* Description Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Describe your issue
                </label>
                <textarea
                  value={bookingDescription}
                  onChange={(e) => {
                    setBookingDescription(e.target.value);
                    setBookingError("");
                  }}
                  placeholder="E.g., Fan not working, need electrical check..."
                  maxLength={500}
                  className="w-full h-32 p-4 bg-muted rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none resize-none text-foreground placeholder:text-muted-foreground"
                />
                <div className="flex justify-between mt-2">
                  {bookingError && (
                    <p className="text-sm text-destructive">{bookingError}</p>
                  )}
                  <p className="text-xs text-muted-foreground ml-auto">
                    {bookingDescription.length}/500
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBooking}
                disabled={submitting}
                className="w-full h-14 gradient-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 haptic shadow-glow disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Send Request
                  </>
                )}
              </motion.button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                The worker will accept or reject your request
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
        <div className="container flex items-center gap-4">
          <a
            href={`tel:${professional.profiles?.phone}`}
            className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center haptic"
          >
            <Phone className="w-6 h-6 text-foreground" />
          </a>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { navigate("/auth"); return; }
              const convId = await getOrCreateConversation(professional.id);
              if (convId) navigate(`/chat/${convId}`);
            }}
            className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center haptic"
          >
            <MessageSquare className="w-6 h-6 text-secondary" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBookingModal(true)}
            disabled={!professional.is_available}
            className="flex-1 h-14 gradient-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 haptic shadow-glow disabled:opacity-50"
          >
            <Calendar className="w-5 h-5" />
            Book Now • Rs {professional.hourly_rate}/hr
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetailPage;
