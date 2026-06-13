import { motion } from "framer-motion";
import { MapPin, ChevronRight, Sparkles, Shield } from "@/components/icons/FontAwesomeIcons";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { ProfessionalCard } from "@/components/ui/ProfessionalCard";
import { BottomNav } from "@/components/ui/BottomNav";
import { InstallBanner } from "@/components/ui/InstallBanner";
import { OnboardingTutorial } from "@/components/ui/OnboardingTutorial";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";

interface ServiceData {
  id: string;
  name: string;
  type: string;
}

interface ProfessionalData {
  id: string;
  name: string;
  photo: string;
  profession: string;
  rating: number;
  reviewCount: number;
  distance: string;
  hourlyRate: number;
  isAvailable: boolean;
  isVerified: boolean;
}

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userType } = useUserRole();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);

  useEffect(() => {
    const seen = localStorage.getItem("mehnat_onboarding_done");
    if (!seen) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, type")
        .eq("is_active", true)
        .order("created_at");
      if (data) setServices(data);
    };

    const fetchProfessionals = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      // Use the public view (no GPS) for anon users, full table for authenticated
      const table = currentUser ? "professionals" : "professionals_public";
      const { data } = await supabase
        .from(table as any)
        .select("id, user_id, hourly_rate, is_available, is_verified, rating, review_count, profile_id, service_id, profiles:profile_id(full_name, avatar_url), services:service_id(name)")
        // Include either available professionals or those that are verified
        .or('is_available.eq.true,is_verified.eq.true')
        .order("rating", { ascending: false })
        .limit(6);

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: p.profiles?.full_name || "Professional",
          photo: p.profiles?.avatar_url || "",
          profession: p.services?.name || "Worker",
          rating: Number(p.rating) || 0,
          reviewCount: p.review_count || 0,
          distance: t("search.nearby"),
          hourlyRate: p.hourly_rate || 500,
          isAvailable: p.is_available ?? true,
          isVerified: p.is_verified ?? false,
        }));
        setProfessionals(mapped);
      }
    };

    fetchServices();
    fetchProfessionals();
  }, [t]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        setIsAdmin(!!data);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("mehnat_onboarding_done", "true");
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <AnimatePresence>
        {showOnboarding && <OnboardingTutorial onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <header className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">MehnatKash</h1>
              </div>
            </motion.div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground haptic"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Admin</span>
                </motion.button>
              )}

              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted haptic"
              >
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Peshawar</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl hero-gradient p-4 sm:p-6 text-primary-foreground"
        >
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">{t("home.findTrustedHelp")}</h2>
            <p className="text-primary-foreground/80 text-xs sm:text-sm mb-3 sm:mb-4">
              {t("home.workersNearYou")}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(user ? "/search" : "/auth")}
              className="px-6 py-3 bg-card text-foreground rounded-xl font-semibold text-sm shadow-elevated haptic"
            >
              {user ? t("home.findWorkers") : t("home.getStarted")}
            </motion.button>
          </div>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-white/5" />
        </motion.section>

        {/* Services */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{t("home.services")}</h2>
            <button className="text-sm font-medium text-primary flex items-center gap-1">
              {t("home.all")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
            {services.length > 0 ? services.map((service) => (
              <div key={service.id}>
                <ServiceCard
                  {...service}
                  onClick={() => navigate(`/search?service=${service.type}`)}
                />
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">{t("home.noServices")}</p>
            )}
          </div>
        </motion.section>

        {/* Nearby Workers */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">{t("home.nearbyWorkers")}</h2>
            <button className="text-sm font-medium text-primary flex items-center gap-1">
              {t("home.viewAll")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:flex-wrap md:justify-between">
            {professionals.length > 0 ? professionals.map((pro, index) => (
              <motion.div
                key={pro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="w-full md:w-[32%]"
              >
                <ProfessionalCard
                  {...pro}
                  onClick={() => navigate(`/professional/${pro.id}`)}
                />
              </motion.div>
            )) : (
              <p className="text-sm text-muted-foreground">{t("home.noWorkers")}</p>
            )}
          </div>
        </motion.section>
      </main>

      <InstallBanner />
      <BottomNav userType={userType || "customer"} />
    </div>
  );
};

export default Index;
