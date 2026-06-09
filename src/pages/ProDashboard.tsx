import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Check,
  X,
  Clock,
  DollarSign,
  Bell,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Phone,
  CreditCard,
  CheckCircle2,
} from "@/components/icons/FontAwesomeIcons";
import { BottomNav } from "@/components/ui/BottomNav";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const ProDashboard = () => {
  const { jobs, activeJobs, isLoading, acceptJob, rejectJob, markCompleted, markPaid } = useRealtimeBookings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "active">("requests");

  const currentJob = jobs[currentIndex];
  const pendingCount = jobs.length - currentIndex;

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentJob || isProcessing) return;

    setSwipeDirection(direction);
    setIsProcessing(true);

    setTimeout(async () => {
      if (direction === "right") {
        await acceptJob(currentJob.id);
      } else {
        await rejectJob(currentJob.id);
      }

      setSwipeDirection(null);
      setIsProcessing(false);
    }, 300);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe("right");
    } else if (info.offset.x < -threshold) {
      handleSwipe("left");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Just now";
    }
  };

  const todayEarnings = activeJobs.filter(j => j.paymentStatus === "paid").reduce((sum, j) => sum + j.price, 0);
  const unpaidTotal = activeJobs.filter(j => j.paymentStatus === "unpaid" && ["completed", "rated"].includes(j.status)).reduce((sum, j) => sum + j.price, 0);
  const completedCount = activeJobs.filter(j => ["completed", "rated"].includes(j.status)).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">{pendingCount} pending</p>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell count={pendingCount} />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAvailable(!isAvailable)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm haptic ${
                  isAvailable
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                {isAvailable ? "Online" : "Offline"}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Earnings Summary */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 text-center shadow-card">
            <DollarSign className="w-6 h-6 mx-auto text-success mb-1" />
            <p className="text-lg font-bold text-foreground">Rs {todayEarnings}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-4 text-center shadow-card">
            <CreditCard className="w-6 h-6 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">Rs {unpaidTotal}</p>
            <p className="text-xs text-muted-foreground">Unpaid</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-4 text-center shadow-card">
            <Check className="w-6 h-6 mx-auto text-secondary mb-1" />
            <p className="text-lg font-bold text-foreground">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "requests" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Requests ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Active ({activeJobs.length})
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "requests" ? (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Job Cards Stack */}
              <div className="relative h-[400px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-3xl" />
                ) : jobs.length > 0 && currentJob ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentJob.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{
                        opacity: swipeDirection ? 0 : 1,
                        scale: 1,
                        x: swipeDirection === "right" ? 300 : swipeDirection === "left" ? -300 : 0,
                        rotate: swipeDirection === "right" ? 15 : swipeDirection === "left" ? -15 : 0,
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      drag={!isProcessing ? "x" : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={handleDragEnd}
                      className="swipe-card cursor-grab active:cursor-grabbing"
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                        <motion.div initial={{ opacity: 0, scale: 0.5 }} className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                          <X className="w-10 h-10 text-destructive" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.5 }} className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                          <Check className="w-10 h-10 text-success" />
                        </motion.div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary-foreground">
                              {currentJob.customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground">{currentJob.customerName}</h3>
                            <p className="text-sm text-muted-foreground">{formatTimestamp(currentJob.createdAt)}</p>
                          </div>
                          {currentJob.customerPhone && (
                            <a href={`tel:${currentJob.customerPhone}`} className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                              <Phone className="w-5 h-5 text-success" />
                            </a>
                          )}
                        </div>

                        <div className="bg-muted rounded-2xl p-4">
                          <h4 className="font-bold text-foreground mb-1">{currentJob.service}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{currentJob.description || "No description provided"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-xl p-3 text-center">
                            <Clock className="w-5 h-5 mx-auto text-secondary mb-1" />
                            <p className="text-sm font-semibold">{currentJob.scheduledAt ? new Date(currentJob.scheduledAt).toLocaleDateString() : "Flexible"}</p>
                          </div>
                          <div className="bg-accent/20 rounded-xl p-3 text-center">
                            <p className="text-xs text-muted-foreground">Earn</p>
                            <p className="text-lg font-bold text-foreground">Rs {currentJob.price}</p>
                          </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSwipe("left")} disabled={isProcessing}
                            className="flex-1 h-14 bg-destructive text-destructive-foreground rounded-2xl font-bold flex items-center justify-center gap-2 haptic disabled:opacity-50">
                            {isProcessing && swipeDirection === "left" ? <Loader2 className="w-6 h-6 animate-spin" /> : <><X className="w-6 h-6" />Reject</>}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSwipe("right")} disabled={isProcessing}
                            className="flex-1 h-14 gradient-success text-success-foreground rounded-2xl font-bold flex items-center justify-center gap-2 haptic shadow-glow disabled:opacity-50">
                            {isProcessing && swipeDirection === "right" ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" />Accept</>}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-full flex flex-col items-center justify-center text-center">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Bell className="w-12 h-12 text-muted-foreground" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No New Jobs</h3>
                    <p className="text-muted-foreground">New requests will appear here instantly</p>
                  </motion.div>
                )}
              </div>

              {jobs.length > 0 && currentJob && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm text-muted-foreground mt-4">
                  ← Swipe left to reject • Swipe right to accept →
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
              ) : activeJobs.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">No Active Jobs</h3>
                  <p className="text-muted-foreground text-sm">Accepted jobs will appear here</p>
                </div>
              ) : (
                activeJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-2xl p-5 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary-foreground">{job.customerName.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{job.customerName}</h3>
                          <p className="text-sm text-muted-foreground">{job.service}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={job.status === "confirmed" ? "accepted" : job.status as any} size="sm" />
                        <StatusBadge status={job.paymentStatus as any} size="sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-muted-foreground">{formatTimestamp(job.createdAt)}</span>
                      <span className="font-bold text-foreground">Rs {job.price}</span>
                    </div>

                    <div className="flex gap-2">
                      {["confirmed", "in_progress"].includes(job.status) && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => markCompleted(job.id)}
                          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 haptic"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Complete
                        </motion.button>
                      )}
                      {job.paymentStatus === "unpaid" && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => markPaid(job.id)}
                          className="flex-1 py-2.5 bg-success text-success-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 haptic"
                        >
                          <DollarSign className="w-4 h-4" />
                          Mark Paid
                        </motion.button>
                      )}
                      {job.paymentStatus === "paid" && (
                        <div className="flex-1 py-2.5 bg-success/10 text-success rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Payment Received
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav userType="professional" />
    </div>
  );
};

export default ProDashboard;
