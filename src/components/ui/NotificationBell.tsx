import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "@/components/icons/FontAwesomeIcons";

interface NotificationBellProps {
  count: number;
}

export const NotificationBell = ({ count }: NotificationBellProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <div className="relative">
      <motion.div
        animate={isAnimating ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
        transition={{ duration: 0.5 }}
      >
        <Bell className="w-6 h-6 text-foreground" />
      </motion.div>

      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1"
          >
            {count > 9 ? "9+" : count}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
