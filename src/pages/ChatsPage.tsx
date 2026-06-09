import { motion } from "framer-motion";
import { MessageCircle, LogIn } from "@/components/icons/FontAwesomeIcons";
import { BottomNav } from "@/components/ui/BottomNav";
import { useConversations } from "@/hooks/useConversations";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const ChatsPage = () => {
  const navigate = useNavigate();
  const { userType } = useUserRole();
  const { conversations, isLoading, isAuthenticated } = useConversations();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-40 glass border-b border-border safe-top">
          <div className="container py-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
          </div>
        </header>
        <main className="container py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <LogIn className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Sign In Required</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Please sign in to view your messages
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/auth")}
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-semibold haptic"
            >
              Sign In
            </motion.button>
          </motion.div>
        </main>
        <BottomNav userType={userType || "customer"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 glass border-b border-border safe-top"
      >
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
        </div>
      </motion.header>

      <main className="container py-4">
        {conversations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Messages Yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Start a conversation from a worker's profile
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/search")}
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-xl font-semibold haptic"
            >
              Find Workers
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv, index) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-card rounded-2xl shadow-card haptic text-left"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {conv.otherUserAvatar ? (
                      <img
                        src={conv.otherUserAvatar}
                        alt={conv.otherUserName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {conv.otherUserName.charAt(0)}
                      </span>
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-card" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground truncate">{conv.otherUserName}</h3>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessageText || "Start chatting..."}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      <BottomNav userType={userType || "customer"} />
    </div>
  );
};

export default ChatsPage;
