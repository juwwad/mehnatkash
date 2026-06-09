import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, Star, MapPin, Phone, User } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";

interface Professional {
  id: string;
  user_id: string;
  skills: string[];
  hourly_rate: number;
  location_city: string;
  is_verified: boolean;
  verification_status: string;
  rating: number;
  review_count: number;
  created_at: string;
  profiles: {
    full_name: string | null;
    phone: string;
    avatar_url: string | null;
  } | null;
  services: {
    name: string;
    type: string;
  } | null;
}

export const AdminProfessionals = ({ isAdmin }: { isAdmin: boolean }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const fetchProfessionals = async () => {
    if (!isAdmin) return;
    try {
      let query = supabase
        .from("professionals")
        .select(`
          *,
          profiles!professionals_profile_id_fkey (full_name, phone, avatar_url),
          services (name, type)
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("verification_status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error fetching professionals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, [filter, isAdmin]);

  if (!isAdmin) return null;

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professionals")
        .update({ verification_status: "approved", is_verified: true })
        .eq("id", id);

      if (error) throw error;

      toast.success("Professional approved!");
      fetchProfessionals();
    } catch (error) {
      console.error("Error approving:", error);
      toast.error("Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("professionals")
        .update({ verification_status: "rejected", is_verified: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Professional rejected");
      fetchProfessionals();
    } catch (error) {
      console.error("Error rejecting:", error);
      toast.error("Failed to reject");
    }
  };

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "pending" as const, label: "Pending" },
    { id: "approved" as const, label: "Approved" },
    { id: "rejected" as const, label: "Rejected" },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <motion.button
            key={f.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors haptic ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* List */}
      {professionals.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No professionals found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {professionals.map((pro, index) => (
            <motion.div
              key={pro.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-card"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0">
                  {pro.profiles?.avatar_url ? (
                    <img
                      src={pro.profiles.avatar_url}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary-foreground">
                      {pro.profiles?.full_name?.charAt(0) || "?"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-foreground truncate">
                        {pro.profiles?.full_name || "Unknown"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {pro.services?.name || "No service"}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        pro.verification_status === "approved"
                          ? "bg-success/20 text-success"
                          : pro.verification_status === "rejected"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {pro.verification_status}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {pro.profiles?.phone || "N/A"}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {pro.location_city}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-accent" />
                      {pro.rating} ({pro.review_count})
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pro.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 bg-muted rounded-lg text-xs font-medium text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                    {pro.skills.length > 4 && (
                      <span className="px-2 py-0.5 text-xs text-muted-foreground">
                        +{pro.skills.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Rate & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="price-tag text-sm">
                      Rs {pro.hourly_rate}/hr
                    </div>

                    {pro.verification_status === "pending" && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(pro.id)}
                          className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors haptic"
                        >
                          <X className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(pro.id)}
                          className="p-2 rounded-xl bg-success/10 text-success hover:bg-success hover:text-success-foreground transition-colors haptic"
                        >
                          <Check className="w-5 h-5" />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
