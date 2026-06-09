import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, MapPin, LogOut, Star, Briefcase, ChevronRight, Bell, Mail, Edit3, X, Check, Loader2, Wrench, Settings } from "@/components/icons/FontAwesomeIcons";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/ui/BottomNav";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTranslation } from "react-i18next";

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [bookingCount, setBookingCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        setUser(user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profileData) {
          // No profile yet — redirect to auth to complete setup
          navigate("/auth");
          return;
        }

        setProfile(profileData);
        setEditName(profileData.full_name || "");
        setEditPhone(profileData.phone || "");

        // Fetch stats based on user type
        if (profileData.user_type === "professional") {
          const { data: proData } = await supabase
            .from("professionals")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          setProfessional(proData);

          if (proData) {
            setReviewCount(proData.review_count || 0);
            const { count } = await supabase
              .from("bookings")
              .select("*", { count: "exact", head: true })
              .eq("professional_id", proData.id);
            setBookingCount(count || 0);
          }
        } else {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("customer_id", user.id);
          setBookingCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim() || null,
          phone: editPhone.trim() || "",
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev: any) => ({
        ...prev,
        full_name: editName.trim() || null,
        phone: editPhone.trim() || "",
      }));
      setEditing(false);
      toast.success(t("profile.profileUpdated"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    // Clear custom OTP auth
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_user_email");
    localStorage.removeItem("temp_auth_user_id");
    localStorage.removeItem("temp_auth_user_email");
    
    // Also sign out from Supabase if there's an active session
    await supabase.auth.signOut();
    
    toast.success(t("profile.loggedOut"));
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const isPro = profile.user_type === "professional";

  return (
    <div className="min-h-screen bg-background safe-bottom">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary to-primary-glow p-6 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4 border-4 border-white/30">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">
            {profile.full_name || "User"}
          </h1>
          <p className="text-primary-foreground/80 text-sm mt-1">
            {user.email}
          </p>
          {profile.phone && (
            <p className="text-primary-foreground/60 text-xs mt-0.5">
              +92 {profile.phone}
            </p>
          )}
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 text-primary-foreground text-xs font-semibold">
            {isPro ? t("profile.worker") : t("profile.customer")}
          </span>
        </motion.div>
      </header>

      {/* Profile Card */}
      <main className="container -mt-12 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl shadow-elevated p-6 space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pb-6 border-b border-border">
            <div className="text-center">
              <Briefcase className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-xl font-bold text-foreground">{bookingCount}</p>
              <p className="text-xs text-muted-foreground">{t("profile.bookings")}</p>
            </div>
            <div className="text-center">
              <Star className="w-6 h-6 mx-auto text-accent mb-1" />
              <p className="text-xl font-bold text-foreground">
                {isPro && professional ? (Number(professional.rating) || 0).toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{isPro ? `${reviewCount} ${t("profile.reviews")}` : t("profile.rating")}</p>
            </div>
            <div className="text-center">
              <MapPin className="w-6 h-6 mx-auto text-secondary mb-1" />
              <p className="text-xl font-bold text-foreground">
                {isPro && professional?.location_city ? professional.location_city : "Peshawar"}
              </p>
              <p className="text-xs text-muted-foreground">{t("profile.location")}</p>
            </div>
          </div>

          {/* Edit Profile Inline */}
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("profile.fullName")}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-12 px-4 text-base bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">{t("profile.phone")}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm font-semibold">+92</span>
                      <div className="w-px h-5 bg-border" />
                    </div>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="3XX XXXXXXX"
                      className="w-full h-12 pl-16 pr-4 text-base bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setEditing(false); setEditName(profile.full_name || ""); setEditPhone(profile.phone || ""); }}
                    className="flex-1 h-12 bg-muted text-muted-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> {t("profile.cancel")}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t("profile.save")}
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Menu Items */}
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditing(true)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{t("profile.editProfile")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.updateNamePhone")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/bookings")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
            >
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-info" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{t("profile.myBookings")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.totalBookings", { count: bookingCount })}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/chats")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-secondary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{t("profile.messages")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.viewConversations")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            {isSupported && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => isSubscribed ? unsubscribe() : subscribe()}
                disabled={pushLoading}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{t("profile.pushNotifications")}</p>
                  <p className="text-xs text-muted-foreground">
                    {pushLoading ? t("profile.processing") : isSubscribed ? t("profile.enabledTapDisable") : t("profile.tapToEnable")}
                  </p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${isSubscribed ? "bg-primary" : "bg-muted-foreground/30"}`}>
                  <div className={`w-5 h-5 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${isSubscribed ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"}`} />
                </div>
              </motion.button>
            )}

            {isPro && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/pro/dashboard")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
              >
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-foreground">{t("profile.workerDashboard")}</p>
                  <p className="text-xs text-muted-foreground">{t("profile.manageJobsEarnings")}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/settings")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic"
            >
              <div className="w-10 h-10 rounded-xl bg-muted-foreground/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{t("profile.settings")}</p>
                <p className="text-xs text-muted-foreground">{t("profile.themeLanguage")}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>

          {/* Account Info */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t("profile.account")}</p>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">+92 {profile.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground capitalize">{profile.user_type}</span>
            </div>
          </div>

          {/* Logout */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-destructive/10 text-destructive font-semibold haptic hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t("profile.logout")}
          </motion.button>
        </motion.div>

        {/* Become Professional CTA */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 p-6 rounded-3xl gradient-secondary text-secondary-foreground"
          >
            <h3 className="font-bold text-lg mb-2">{t("profile.becomeWorker")}</h3>
            <p className="text-sm opacity-90 mb-4">
              {t("profile.startEarning")}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/pro/onboarding")}
              className="px-6 py-3 bg-card text-foreground rounded-xl font-semibold text-sm haptic"
            >
              {t("home.getStarted")}
            </motion.button>
          </motion.div>
        )}
      </main>

      <BottomNav userType={isPro ? "professional" : "customer"} />
    </div>
  );
};

export default ProfilePage;
