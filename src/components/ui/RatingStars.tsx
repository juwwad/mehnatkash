import { Star } from "@/components/icons/FontAwesomeIcons";
import { motion } from "framer-motion";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export const RatingStars = ({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: RatingStarsProps) => {
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }).map((_, index) => {
        const isFilled = index < rating;

        return (
          <motion.button
            key={index}
            whileHover={interactive ? { scale: 1.2 } : undefined}
            whileTap={interactive ? { scale: 0.9 } : undefined}
            onClick={() => handleClick(index)}
            disabled={!interactive}
            className={`${interactive ? "cursor-pointer haptic" : "cursor-default"}`}
          >
            <Star
              className={`${sizeClasses[size]} transition-colors ${
                isFilled ? "text-accent fill-accent" : "text-muted-foreground/30"
              }`}
            />
          </motion.button>
        );
      })}
    </div>
  );
};
