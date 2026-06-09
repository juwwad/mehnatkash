import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useCustomerNotifications = () => {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("customer-booking-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `customer_id=eq.${user.id}`,
          },
          async (payload) => {
            const updated = payload.new as { id: string; status: string; professional_id: string; service_id: string | null };
            const old = payload.old as { status: string };

            if (updated.status === old.status) return;

            // Fetch professional name
            let proName = "Worker";
            const { data: pro } = await supabase
              .from("professionals")
              .select("profile_id")
              .eq("id", updated.professional_id)
              .single();

            if (pro?.profile_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", pro.profile_id)
                .single();
              proName = profile?.full_name || "Worker";
            }

            // Fetch service name
            let serviceName = "Service";
            if (updated.service_id) {
              const { data: svc } = await supabase
                .from("services")
                .select("name")
                .eq("id", updated.service_id)
                .single();
              serviceName = svc?.name || "Service";
            }

            if (updated.status === "confirmed") {
              try { navigator.vibrate?.([200, 100, 200]); } catch {}
              toast({
                title: "✅ Booking Accepted!",
                description: `${proName} accepted your ${serviceName} request`,
              });
            } else if (updated.status === "cancelled") {
              toast({
                title: "❌ Booking Declined",
                description: `${proName} declined your ${serviceName} request`,
                variant: "destructive",
              });
            } else if (updated.status === "completed") {
              toast({
                title: "🎉 Job Completed!",
                description: `${proName} completed your ${serviceName}`,
              });
            }
          }
        )
        .subscribe();
    };

    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);
};
