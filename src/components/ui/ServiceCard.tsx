import { motion } from "framer-motion";
import { getServiceIcon } from "../icons/ServiceIcons";

interface ServiceCardProps {
  id: string;
  name: string;
  type: string;
  onClick?: () => void;
}

export const ServiceCard = ({ id, name, type, onClick }: ServiceCardProps) => {
  const IconComponent = getServiceIcon(type);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="service-icon-card w-full aspect-square haptic p-3 sm:p-6 rounded-xl sm:rounded-2xl"
    >
      <IconComponent className="w-10 h-10 sm:w-16 sm:h-16 mb-1.5 sm:mb-3" />
      <span className="text-[11px] sm:text-sm font-semibold text-foreground text-center leading-tight line-clamp-2">
        {name}
      </span>
    </motion.button>
  );
};
