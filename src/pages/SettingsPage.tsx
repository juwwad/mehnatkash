import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sun, Globe, Bell, BellOff, Smartphone, Info } from "@/components/icons/FontAwesomeIcons";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/ui/BottomNav";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type Theme = "light" | "dark" | "system";
type Language = "en" | "ur" | "ps";

const languageLabels: Record<Language, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  ur: { native: "اردو", english: "Urdu" },
  ps: { native: "پښتو", english: "Pashto" },
};

const rtlLanguages: Language[] = ["ur", "ps"];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("mehnat_theme") as Theme) || "system";
  });
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("mehnat_language") as Language) || "en";
  });
  const [userType, setUserType] = useState<string>("customer");
  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    const fetchUserType = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setUserType(data.user_type);
      }
    };
    fetchUserType();
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("mehnat_theme", theme);

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  // Apply language + RTL
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("mehnat_language", lang);
    document.documentElement.dir = rtlLanguages.includes(lang) ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  // Set RTL on mount
  useEffect(() => {
    document.documentElement.dir = rtlLanguages.includes(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="w-5 h-5" />, label: t("settings.light") },
    { value: "dark", icon: <Moon className="w-5 h-5" />, label: t("settings.dark") },
    { value: "system", icon: <Smartphone className="w-5 h-5" />, label: t("settings.system") },
  ];

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-40 glass border-b border-border safe-top">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center haptic"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 pb-24">
        {/* Theme */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl shadow-card p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h2 className="font-bold text-foreground">{t("settings.appearance")}</h2>
              <p className="text-xs text-muted-foreground">{t("settings.chooseTheme")}</p>
            </div>
          </div>

          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {themeOptions.map((opt) => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors haptic ${
                  theme === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {opt.icon}
                {opt.label}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Language */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl shadow-card p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{t("settings.language")}</h2>
              <p className="text-xs text-muted-foreground">{t("settings.selectLanguage")}</p>
            </div>
          </div>

          <div className="space-y-2">
            {(Object.entries(languageLabels) as [Language, { native: string; english: string }][]).map(
              ([code, labels]) => (
                <motion.button
                  key={code}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLanguageChange(code)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-colors haptic ${
                    language === code
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/50 border-2 border-transparent hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{labels.native}</span>
                    {code !== "en" && (
                      <span className="text-sm text-muted-foreground">({labels.english})</span>
                    )}
                  </div>
                  {language === code && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              )
            )}
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-3xl shadow-card p-5 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{t("settings.notifications")}</h2>
              <p className="text-xs text-muted-foreground">{t("settings.manageAlerts")}</p>
            </div>
          </div>

          {isSupported ? (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
              disabled={pushLoading}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors haptic disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <Bell className="w-5 h-5 text-success" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="font-semibold text-foreground">{t("settings.pushNotifications")}</p>
                  <p className="text-xs text-muted-foreground">
                    {pushLoading
                      ? t("profile.processing")
                      : isSubscribed
                      ? t("settings.getAlerts")
                      : t("settings.enableToStay")}
                  </p>
                </div>
              </div>
              <div
                className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                  isSubscribed ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-card shadow-sm transition-transform ${
                    isSubscribed ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </motion.button>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/50 text-sm text-muted-foreground">
              {t("settings.notSupported")}
            </div>
          )}
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-3xl shadow-card p-5 space-y-3"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Info className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{t("settings.about")}</h2>
              <p className="text-xs text-muted-foreground">{t("settings.appInfo")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">{t("settings.version")}</span>
              <span className="text-sm font-semibold text-foreground">1.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <span className="text-sm text-muted-foreground">{t("settings.platform")}</span>
              <span className="text-sm font-semibold text-foreground">PWA</span>
            </div>
          </div>
        </motion.section>
      </main>

      <BottomNav userType={userType === "professional" ? "professional" : "customer"} />
    </div>
  );
};

export default SettingsPage;
