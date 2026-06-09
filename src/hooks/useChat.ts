import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  professionalId: string;
  bookingId: string | null;
  lastMessageText: string | null;
  lastMessageAt: string;
  createdAt: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  unreadCount: number;
  isOnline: boolean;
}

export const useChat = (conversationId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          content: m.content,
          imageUrl: m.image_url,
          isRead: m.is_read,
          createdAt: m.created_at,
        }))
      );
    }
    setIsLoading(false);
  }, [conversationId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;

    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  }, [conversationId, currentUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const newMsg: ChatMessage = {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content,
            imageUrl: m.image_url,
            isRead: m.is_read,
            createdAt: m.created_at,
          };
          setMessages((prev) => [...prev, newMsg]);

          // Auto-mark as read if from other user
          if (m.sender_id !== currentUserId) {
            markAsRead();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === m.id ? { ...msg, isRead: m.is_read } : msg
            )
          );
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.values(state)
          .flat()
          .filter((s: any) => s.typing && s.userId !== currentUserId);
        setIsTyping(typingUsers.length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: currentUserId, typing: false, online: true });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, fetchMessages, markAsRead]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (!conversationId || !currentUserId) return false;
      if (!content.trim() && !imageUrl) return false;

      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: content.trim() || null,
        image_url: imageUrl || null,
      });

      return !error;
    },
    [conversationId, currentUserId]
  );

  // Upload image
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const ext = file.name.split(".").pop();
      const path = `${conversationId}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { contentType: file.type });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("chat-images")
        .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 day signed URL

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Signed URL error:", signedUrlError);
        return null;
      }

      return signedUrlData.signedUrl;
    },
    [conversationId]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    if (!conversationId) return;

    const channel = supabase.channel(`chat-${conversationId}`);
    await channel.track({ userId: currentUserId, typing: true, online: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await channel.track({ userId: currentUserId, typing: false, online: true });
    }, 2000);
  }, [conversationId, currentUserId]);

  return {
    messages,
    isLoading,
    isTyping,
    currentUserId,
    sendMessage,
    uploadImage,
    sendTypingIndicator,
    markAsRead,
  };
};
