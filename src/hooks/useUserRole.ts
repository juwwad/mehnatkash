import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const [userType, setUserType] = useState<"customer" | "professional" | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // First check for custom OTP auth
        const authUserId = localStorage.getItem("auth_user_id");
        const authUserEmail = localStorage.getItem("auth_user_email");

        if (authUserId) {
          // User is authenticated via custom OTP
          setUser({ id: authUserId, email: authUserEmail });

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("user_id", authUserId)
            .maybeSingle();

          setUserType((profile?.user_type as "customer" | "professional") || null);
          setLoading(false);
          return;
        }

        // Fallback to Supabase auth session
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        
        if (!currentUser) {
          setUserType(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        setUserType((profile?.user_type as "customer" | "professional") || null);
      } catch (error) {
        console.error("Error checking user role:", error);
        setUserType(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserRole();
    });

    return () => subscription?.unsubscribe();
  }, []);

  return { userType, loading, user };
};
