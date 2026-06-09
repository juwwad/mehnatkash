import { Home, Search, Briefcase, User, Bell, MessageCircle } from "@/components/icons/FontAwesomeIcons";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface NavItem {
  icon: React.ElementType;
  path: string;
  labelKey: string;
}

const customerNavItems: NavItem[] = [
  { icon: Home, path: "/", labelKey: "nav.home" },
  { icon: Search, path: "/search", labelKey: "nav.search" },
  { icon: MessageCircle, path: "/chats", labelKey: "nav.chats" },
  { icon: Briefcase, path: "/bookings", labelKey: "nav.bookings" },
  { icon: User, path: "/profile", labelKey: "nav.profile" },
];

const professionalNavItems: NavItem[] = [
  { icon: Home, path: "/pro/dashboard", labelKey: "nav.jobs" },
  { icon: MessageCircle, path: "/chats", labelKey: "nav.chats" },
  { icon: Briefcase, path: "/pro/bookings", labelKey: "nav.bookings" },
  { icon: Bell, path: "/pro/notifications", labelKey: "nav.alerts" },
  { icon: User, path: "/profile", labelKey: "nav.profile" },
];

interface BottomNavProps {
  userType?: "customer" | "professional";
}

export const BottomNav = ({ userType = "customer" }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const navItems = userType === "professional" ? professionalNavItems : customerNavItems;

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
      className="bottom-nav"
    >
      {navItems.map((item, index) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.path}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(item.path)}
            className={`nav-item ${isActive ? "active" : ""}`}
          >
            <Icon
              className={`w-6 h-6 ${isActive ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span
              className={`text-xs font-medium ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {t(item.labelKey)}
            </span>
            {isActive && (
              <motion.div
                layoutId="navIndicator"
                className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
              />
            )}
          </motion.button>
        );
      })}
    </motion.nav>
  );
};
