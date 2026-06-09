import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface JobRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  serviceId: string | null;
  description: string;
  price: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  scheduledAt: string | null;
}

export const useRealtimeBookings = () => {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfessionalId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (professional) {
        setProfessionalId(professional.id);
      }
    };

    fetchProfessionalId();
  }, []);

  const mapBookingsToJobs = (data: any[], profiles: any[]): JobRequest[] => {
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    return (data || []).map((booking) => {
      const profile = profileMap.get(booking.customer_id);
      return {
        id: booking.id,
        customerId: booking.customer_id,
        customerName: profile?.full_name || "Customer",
        customerPhone: profile?.phone,
        service: (booking.services as { name: string } | null)?.name || "Service",
        serviceId: booking.service_id,
        description: booking.description || "",
        price: booking.price || 0,
        status: booking.status || "requested",
        paymentStatus: booking.payment_status || "unpaid",
        createdAt: booking.created_at,
        scheduledAt: booking.scheduled_at,
      };
    });
  };

  const fetchBookings = useCallback(async () => {
    if (!professionalId) return;

    setIsLoading(true);
    try {
      // Fetch pending bookings
      const { data: pendingData, error: pendingError } = await supabase
        .from("bookings")
        .select(`id, customer_id, description, price, status, created_at, scheduled_at, service_id, payment_status, services:service_id (name)`)
        .eq("professional_id", professionalId)
        .eq("status", "requested")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      // Fetch active bookings (confirmed, in_progress, completed)
      const { data: activeData, error: activeError } = await supabase
        .from("bookings")
        .select(`id, customer_id, description, price, status, created_at, scheduled_at, service_id, payment_status, services:service_id (name)`)
        .eq("professional_id", professionalId)
        .in("status", ["confirmed", "in_progress", "completed", "rated"])
        .order("created_at", { ascending: false });

      if (activeError) throw activeError;

      const allCustomerIds = [...new Set([
        ...(pendingData || []).map(b => b.customer_id),
        ...(activeData || []).map(b => b.customer_id),
      ])];

      const { data: profiles } = allCustomerIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", allCustomerIds)
        : { data: [] };

      setJobs(mapBookingsToJobs(pendingData || [], profiles || []));
      setActiveJobs(mapBookingsToJobs(activeData || [], profiles || []));
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    if (!professionalId) return;

    fetchBookings();

    const channel = supabase
      .channel("professional-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `professional_id=eq.${professionalId}`,
        },
        async (payload) => {
          const newBooking = payload.new as any;
          if (newBooking.status !== "requested") return;

          let serviceName = "Service";
          if (newBooking.service_id) {
            const { data: service } = await supabase
              .from("services")
              .select("name")
              .eq("id", newBooking.service_id)
              .single();
            serviceName = service?.name || "Service";
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", newBooking.customer_id)
            .single();

          const newJob: JobRequest = {
            id: newBooking.id,
            customerId: newBooking.customer_id,
            customerName: profile?.full_name || "Customer",
            customerPhone: profile?.phone,
            service: serviceName,
            serviceId: newBooking.service_id,
            description: newBooking.description || "",
            price: newBooking.price || 0,
            status: newBooking.status,
            paymentStatus: newBooking.payment_status || "unpaid",
            createdAt: newBooking.created_at,
            scheduledAt: newBooking.scheduled_at,
          };

          setJobs((prev) => [newJob, ...prev]);

          try {
            if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          } catch (e) {}

          toast({
            title: "🔔 New Job Request!",
            description: `${serviceName} - Rs ${newBooking.price || 0}`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `professional_id=eq.${professionalId}`,
        },
        () => {
          // Re-fetch to keep active jobs in sync
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId, fetchBookings]);

  const acceptJob = async (jobId: string) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", jobId);

      if (error) throw error;

      setJobs((prev) => prev.filter((j) => j.id !== jobId));

      if (job) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: job.customerId,
            title: "✅ Booking Accepted!",
            body: `Your ${job.service} request has been accepted`,
            data: { url: "/bookings", bookingId: jobId },
          },
        }).catch(console.error);
      }

      toast({ title: "✅ Job Accepted!", description: "Customer has been notified" });
      fetchBookings();
      return true;
    } catch (error) {
      console.error("Error accepting job:", error);
      toast({ title: "Error", description: "Failed to accept job", variant: "destructive" });
      return false;
    }
  };

  const rejectJob = async (jobId: string) => {
    try {
      const job = jobs.find((j) => j.id === jobId);
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", jobId);

      if (error) throw error;

      setJobs((prev) => prev.filter((j) => j.id !== jobId));

      if (job) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: job.customerId,
            title: "❌ Booking Declined",
            body: `Your ${job.service} request was declined`,
            data: { url: "/bookings", bookingId: jobId },
          },
        }).catch(console.error);
      }

      toast({ title: "❌ Job Declined", description: "Request has been declined" });
      return true;
    } catch (error) {
      console.error("Error rejecting job:", error);
      toast({ title: "Error", description: "Failed to decline job", variant: "destructive" });
      return false;
    }
  };

  const markCompleted = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", jobId);

      if (error) throw error;

      const job = activeJobs.find((j) => j.id === jobId);
      if (job) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: job.customerId,
            title: "✅ Job Completed!",
            body: `Your ${job.service} job has been marked as completed`,
            data: { url: "/bookings", bookingId: jobId },
          },
        }).catch(console.error);
      }

      toast({ title: "✅ Marked Complete", description: "Customer has been notified" });
      fetchBookings();
      return true;
    } catch (error) {
      console.error("Error completing job:", error);
      toast({ title: "Error", description: "Failed to mark complete", variant: "destructive" });
      return false;
    }
  };

  const markPaid = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", jobId);

      if (error) throw error;

      const job = activeJobs.find((j) => j.id === jobId);
      if (job) {
        supabase.functions.invoke("send-push-notification", {
          body: {
            userId: job.customerId,
            title: "💰 Payment Received",
            body: `Payment of Rs ${job.price} for ${job.service} has been confirmed`,
            data: { url: "/bookings", bookingId: jobId },
          },
        }).catch(console.error);
      }

      toast({ title: "💰 Marked as Paid", description: `Rs ${job?.price || 0} payment confirmed` });
      fetchBookings();
      return true;
    } catch (error) {
      console.error("Error marking paid:", error);
      toast({ title: "Error", description: "Failed to mark as paid", variant: "destructive" });
      return false;
    }
  };

  return {
    jobs,
    activeJobs,
    isLoading,
    professionalId,
    acceptJob,
    rejectJob,
    markCompleted,
    markPaid,
    refetch: fetchBookings,
  };
};
