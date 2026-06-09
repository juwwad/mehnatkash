import { motion } from "framer-motion";
import { Star, MapPin, Clock, Phone } from "@/components/icons/FontAwesomeIcons";

interface ProfessionalCardProps {
  id: string;
  name: string;
  photo?: string;
  profession: string;
  rating: number;
  reviewCount: number;
  distance: string;
  hourlyRate: number;
  isAvailable: boolean;
  isVerified?: boolean;
  onClick?: () => void;
}

export const ProfessionalCard = ({
  id,
  name,
  photo,
  profession,
  rating,
  reviewCount,
  distance,
  hourlyRate,
  isAvailable,
  isVerified = false,
  onClick
}: ProfessionalCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`pro-card cursor-pointer ${isVerified ? "pro-card-premium" : ""} rounded-2xl sm:rounded-3xl`}>
      
      <div className="flex gap-3 p-3">
        {/* Photo */}
        <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
          {photo ? (
            <img src={photo} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
              <span className="text-2xl font-bold text-primary-foreground">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {isVerified && (
            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              ✓
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground leading-tight truncate">{name}</h3>
              <p className="text-xs text-muted-foreground">{profession}</p>
            </div>
            <div className="flex items-center gap-0.5 bg-accent/20 px-1.5 py-0.5 rounded-md flex-shrink-0">
              <Star className="w-3 h-3 text-accent fill-accent" />
              <span className="font-bold text-xs">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{distance}</span>
            </div>
            <span
              className={`flex items-center gap-1 ${isAvailable ? "text-success" : ""}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
              {isAvailable ? "Available" : "Busy"}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="price-tag text-xs">
              <span>Rs</span>
              <span className="font-bold text-sm">{hourlyRate}</span>
              <span className="opacity-70">/hr</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-semibold text-xs haptic"
            >
              <Phone className="w-3 h-3" />
              Book
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>);

};