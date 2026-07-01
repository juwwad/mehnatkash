import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationItem {
  id: string;
  customerId: string;
  professionalId: string;
  bookingId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  unreadCount: number;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const fetchConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    setIsAuthenticated(true);
    setCurrentUserId(user.id);
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    // Get other user IDs
    const otherUserIds = new Set<string>();
    const professionalIds = new Set<string>();

    data.forEach((c) => {
      if (c.customer_id === user.id) {
        professionalIds.add(c.professional_id);
      } else {
        otherUserIds.add(c.customer_id);
      }
    });

    // Fetch professional profiles
    let proProfileMap = new Map<string, { name: string; avatar: string | null }>();
    if (professionalIds.size > 0) {
      const { data: pros } = await supabase
        .from("professionals")
        .select("id, profile_id")
        .in("id", [...professionalIds]);

      if (pros) {
        const profileIds = pros.map((p) => p.profile_id).filter(Boolean) as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", profileIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        pros.forEach((p) => {
          const profile = p.profile_id ? profileMap.get(p.profile_id) : null;
          proProfileMap.set(p.id, {
            name: profile?.full_name || "Worker",
            avatar: profile?.avatar_url || null,
          });
        });
      }
    }

    // Fetch customer profiles
    let customerProfileMap = new Map<string, { name: string; avatar: string | null }>();
    if (otherUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", [...otherUserIds]);

      profiles?.forEach((p) => {
        customerProfileMap.set(p.user_id, {
          name: p.full_name || "Customer",
          avatar: p.avatar_url || null,
        });
      });
    }

    // Get unread counts
    const convIds = data.map((c) => c.id);
    const { data: unreadData } = await supabase
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_read", false);

    const unreadMap = new Map<string, number>();
    unreadData?.forEach((m) => {
      unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
    });

    const items: ConversationItem[] = data.map((c) => {
      const isCustomer = c.customer_id === user.id;
      const other = isCustomer
        ? proProfileMap.get(c.professional_id)
        : customerProfileMap.get(c.customer_id);

      return {
        id: c.id,
        customerId: c.customer_id,
        professionalId: c.professional_id,
        bookingId: c.booking_id,
        lastMessageText: c.last_message_text,
        lastMessageAt: c.last_message_at || c.created_at,
        otherUserName: other?.name || "User",
        otherUserAvatar: other?.avatar || null,
        unreadCount: unreadMap.get(c.id) || 0,
      };
    });

    setConversations(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    // Listen for conversation updates
    const channel = supabase
      .channel("conversation-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  // Create or get conversation
  const getOrCreateConversation = useCallback(
    async (professionalId: string, bookingId?: string): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check existing
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", user.id)
        .eq("professional_id", professionalId)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          customer_id: user.id,
          professional_id: professionalId,
          booking_id: bookingId || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return null;
      }

      fetchConversations();
      return created.id;
    },
    [fetchConversations]
  );

  // Get or create a conversation tied to a specific booking.
  // Works for EITHER party — customer_id/professional_id are read from
  // the booking row itself, not assumed from the caller's own auth.uid().
  const getOrCreateConversationForBooking = useCallback(
    async (bookingId: string): Promise<string | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Already exists?
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (existing) return existing.id;

      // Look up the booking to get the correct customer/professional pair
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("customer_id, professional_id")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("Error fetching booking for conversation:", bookingError, booking);
        return null;
      }

      console.debug("Booking found for conversation:", bookingId, booking);

      // Try to create conversation via Edge Function (service role) to avoid RLS insert issues
      try {
        const res = await supabase.functions.invoke("create-conversation", { body: { bookingId } });
        if (res?.data && (res as any).status === 200) {
          const id = (res as any).data.id || (res as any).data?.id;
          console.debug("Conversation created via function:", id);
          fetchConversations();
          return id || null;
        } else {
          console.error("create-conversation function returned unexpected response:", res);
        }
      } catch (fnErr) {
        console.error("create-conversation function failed:", fnErr);
      }

      // Fallback: attempt direct insert (may fail due to RLS)
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          customer_id: booking.customer_id,
          professional_id: booking.professional_id,
          booking_id: bookingId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation for booking (direct insert):", error, { booking });
        return null;
      }

      console.debug("Conversation created for booking (direct):", created);
      fetchConversations();
      return created.id;
    },
    [fetchConversations]
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return {
    conversations,
    isLoading,
    isAuthenticated,
    currentUserId,
    totalUnread,
    getOrCreateConversation,
    getOrCreateConversationForBooking,
    refetch: fetchConversations,
  };
};
