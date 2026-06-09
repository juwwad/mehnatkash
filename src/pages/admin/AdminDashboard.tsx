import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Briefcase, 
  Settings, 
  BarChart3, 
  Shield,
  ChevronRight,
  LogOut
} from "@/components/icons/FontAwesomeIcons";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminProfessionals } from "@/components/admin/AdminProfessionals";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminBookings } from "@/components/admin/AdminBookings";
import { AdminStats } from "@/components/admin/AdminStats";
import { useAdmin } from "@/hooks/useAdmin";

type AdminTab = "stats" | "professionals" | "services" | "bookings";

const tabs = [
  { id: "stats" as AdminTab, label: "Overview", icon: BarChart3 },
  { id: "professionals" as AdminTab, label: "Workers", icon: Users },
  { id: "services" as AdminTab, label: "Services", icon: Briefcase },
  { id: "bookings" as AdminTab, label: "Bookings", icon: Settings },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const { isAdmin } = useAdmin();

  const handleLogout = async () => {
    // Clear custom OTP auth
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_user_email");
    localStorage.removeItem("temp_auth_user_id");
    localStorage.removeItem("temp_auth_user_email");
    
    // Also sign out from Supabase if there's an active session
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">MehnatKash Management</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors haptic"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="sticky top-[73px] z-30 bg-background border-b border-border">
        <div className="container">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-colors haptic ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container py-6">
        {activeTab === "stats" && <AdminStats isAdmin={isAdmin} />}
        {activeTab === "professionals" && <AdminProfessionals isAdmin={isAdmin} />}
        {activeTab === "services" && <AdminServices isAdmin={isAdmin} />}
        {activeTab === "bookings" && <AdminBookings isAdmin={isAdmin} />}
      </main>
    </div>
  );
};

export default AdminDashboard;
