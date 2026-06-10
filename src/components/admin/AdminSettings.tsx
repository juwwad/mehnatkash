import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, AlertCircle, CheckCircle, Info, Eye, EyeOff, Lock } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Setting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  setting_type: "string" | "number" | "boolean" | "json";
  is_sensitive: boolean;
  updated_at: string;
}

interface SettingCategory {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keys: string[];
}

export const AdminSettings = ({ isAdmin }: { isAdmin: boolean }) => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .order("setting_key");

      if (error) throw error;

      setSettings(data || []);
      const values: Record<string, string> = {};
      (data || []).forEach((setting) => {
        values[setting.setting_key] = setting.setting_value;
      });
      setFormValues(values);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings
        .filter((s) => formValues[s.setting_key] !== s.setting_value)
        .map((s) => ({
          id: s.id,
          setting_key: s.setting_key,
          setting_value: formValues[s.setting_key],
          description: s.description,
          setting_type: s.setting_type,
          is_sensitive: s.is_sensitive,
        }));

      if (updates.length === 0) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      for (const update of updates) {
        const { error } = await supabase
          .from("admin_settings")
          .update({ setting_value: update.setting_value })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success(`${updates.length} setting(s) updated successfully!`);
      setHasChanges(false);
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const categories: SettingCategory[] = [
    {
      title: "Platform Settings",
      description: "General platform configuration",
      icon: Info,
      keys: ["platform_name", "maintenance_mode"],
    },
    {
      title: "Pricing & Commission",
      description: "Revenue and pricing configuration",
      icon: AlertCircle,
      keys: ["commission_rate", "base_hourly_rate", "max_booking_distance_km"],
    },
    {
      title: "Professional Management",
      description: "Professional approval and verification settings",
      icon: CheckCircle,
      keys: ["auto_approve_professionals", "min_rating_to_show"],
    },
    {
      title: "Booking Configuration",
      description: "Booking timeout and expiration settings",
      icon: AlertCircle,
      keys: ["booking_timeout_minutes", "require_email_verification"],
    },
    {
      title: "Communication",
      description: "Support and notification settings",
      icon: Info,
      keys: ["support_email", "support_phone", "enable_push_notifications"],
    },
  ];

  const renderSettingInput = (setting: Setting) => {
    const value = formValues[setting.setting_key] || "";
    const isSensitive = setting.is_sensitive;
    const showValue = showSensitive[setting.setting_key] || !isSensitive;

    if (setting.setting_type === "boolean") {
      return (
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              handleChange(setting.setting_key, value === "true" ? "false" : "true")
            }
            className={`relative w-14 h-8 rounded-full transition-colors ${
              value === "true" ? "bg-success" : "bg-muted"
            }`}
          >
            <motion.div
              initial={false}
              animate={{ x: value === "true" ? 24 : 4 }}
              className="w-6 h-6 bg-white rounded-full shadow-lg"
            />
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            {value === "true" ? "Enabled" : "Disabled"}
          </span>
        </div>
      );
    }

    if (setting.setting_type === "number") {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
          className="w-full px-4 py-2.5 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors text-foreground"
        />
      );
    }

    return (
      <div className="relative">
        {isSensitive && (
          <button
            onClick={() =>
              setShowSensitive((prev) => ({
                ...prev,
                [setting.setting_key]: !prev[setting.setting_key],
              }))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        <input
          type={isSensitive && !showValue ? "password" : "text"}
          value={value}
          onChange={(e) => handleChange(setting.setting_key, e.target.value)}
          className={`w-full px-4 py-2.5 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors text-foreground ${
            isSensitive ? "pr-10" : ""
          }`}
        />
        {isSensitive && (
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        )}
      </div>
    );
  };

  const getSettingByKey = (key: string) => settings.find((s) => s.setting_key === key);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 w-40 bg-muted rounded" />
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-10 w-full bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {categories.map((category, categoryIndex) => {
        const categorySettings = category.keys
          .map((key) => getSettingByKey(key))
          .filter(Boolean) as Setting[];

        if (categorySettings.length === 0) return null;

        const Icon = category.icon;

        return (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-card"
          >
            {/* Category Header */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">{category.title}</h3>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-6">
              {categorySettings.map((setting, index) => (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + index * 0.05 }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {setting.setting_key.replace(/_/g, " ").toUpperCase()}
                      {setting.is_sensitive && (
                        <Lock className="w-3.5 h-3.5 text-warning opacity-60" />
                      )}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      Type: {setting.setting_type}
                    </span>
                  </div>

                  {setting.description && (
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  )}

                  {renderSettingInput(setting)}

                  {formValues[setting.setting_key] !== setting.setting_value && (
                    <p className="text-xs text-warning font-medium">
                      ⚠ Changed from: {setting.setting_value}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pt-6 pb-6">
        <div className="container">
          <motion.button
            whileHover={hasChanges ? { scale: 1.02 } : {}}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors haptic ${
              hasChanges
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {hasChanges ? "Save Changes" : "All Saved"}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
