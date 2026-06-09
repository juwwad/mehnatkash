import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "@/components/icons/FontAwesomeIcons";
import { RatingStars } from "@/components/ui/RatingStars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  bookingId: string;
  professionalId: string;
  professionalName: string;
  serviceName: string;
}

export const RatingModal = ({
  isOpen,
  onClose,
  onSubmit,
  bookingId,
  professionalId,
  professionalName,
  serviceName,
}: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: ratingError } = await supabase.from("ratings").insert({
        booking_id: bookingId,
        professional_id: professionalId,
        customer_id: user.id,
        rating,
        review: review.trim() || null,
      });

      if (ratingError) throw ratingError;

      // Update booking status to "rated"
      await supabase
        .from("bookings")
        .update({ status: "rated" })
        .eq("id", bookingId);

      toast({ title: "⭐ Thank you for your review!" });
      setRating(0);
      setReview("");
      onSubmit();
    } catch (error: any) {
      console.error("Rating error:", error);
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-3xl w-full max-w-md p-6 space-y-6 shadow-elevated"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Rate Your Experience</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center haptic"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>

            {/* Professional info */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {professionalName.charAt(0)}
                </span>
              </div>
              <p className="font-semibold text-foreground">{professionalName}</p>
              <p className="text-sm text-muted-foreground">{serviceName}</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center">
              <RatingStars
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating === 0
                ? "Tap a star to rate"
                : rating <= 2
                ? "We're sorry to hear that"
                : rating <= 3
                ? "Thank you for your feedback"
                : rating <= 4
                ? "Great experience!"
                : "Excellent! 🎉"}
            </p>

            {/* Review text */}
            <div className="relative">
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, 500))}
                placeholder="Share your experience (optional)..."
                rows={3}
                className="w-full bg-muted rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {review.length}/500
              </span>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full h-14 gradient-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 haptic shadow-glow disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
