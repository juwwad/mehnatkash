import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Briefcase, CheckCircle, Clock, DollarSign, TrendingUp } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalProfessionals: number;
  pendingApprovals: number;
  totalBookings: number;
  completedBookings: number;
  activeServices: number;
  totalRevenue: number;
}

export const AdminStats = ({ isAdmin }: { isAdmin: boolean }) => {
  const [stats, setStats] = useState<Stats>({
    totalProfessionals: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    completedBookings: 0,
    activeServices: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStats = async () => {
      try {
        const [professionalsRes, pendingRes, bookingsRes, completedRes, servicesRes] = await Promise.all([
          supabase.from("professionals").select("id", { count: "exact", head: true }),
          supabase.from("professionals").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
          supabase.from("bookings").select("id", { count: "exact", head: true }),
          supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);

        // Get revenue from completed bookings
        const { data: revenueData } = await supabase
          .from("bookings")
          .select("price")
          .eq("status", "completed");

        const totalRevenue = revenueData?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;

        setStats({
          totalProfessionals: professionalsRes.count || 0,
          pendingApprovals: pendingRes.count || 0,
          totalBookings: bookingsRes.count || 0,
          completedBookings: completedRes.count || 0,
          activeServices: servicesRes.count || 0,
          totalRevenue,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const statCards = [
    {
      label: "Total Workers",
      value: stats.totalProfessionals,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Pending Approval",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Briefcase,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Completed",
      value: stats.completedBookings,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Active Services",
      value: stats.activeServices,
      icon: TrendingUp,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Total Revenue",
      value: `Rs ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
            <div className="h-12 w-12 rounded-xl bg-muted mb-4" />
            <div className="h-8 w-20 bg-muted rounded mb-2" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Dashboard Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-card"
            >
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
