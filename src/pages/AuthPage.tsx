import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Sparkles, User, Wrench, ShieldCheck, ArrowLeft, Loader2, X, Camera, Lock, Eye, EyeOff } from "@/components/icons/FontAwesomeIcons";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type AuthStep = "choice" | "login" | "signup" | "verify-otp" | "profile" | "complete";
type UserRole = "customer" | "professional";

const AuthPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<AuthStep>("choice");

  // Login/Signup form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP states
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  // Profile states
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  // Check if user already authenticated via real Supabase session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRole) {
        navigate("/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        navigate(profile.user_type === "professional" ? "/pro/dashboard" : "/");
      }
    };
    checkSession();
  }, [navigate]);

  // Handle Login
  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: t("auth.error"), description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (!data.user?.id) throw new Error("Login failed");

      // Store user session
      localStorage.setItem("auth_user_id", data.user.id);
      localStorage.setItem("auth_user_email", data.user.email || "");

      // Check if profile exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // Check for admin role first
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRole) {
        navigate("/admin");
        return;
      }

      if (profile) {
        navigate(profile.user_type === "professional" ? "/pro/dashboard" : "/");
      } else {
        setUserId(data.user.id);
        setStep("profile");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      toast({ title: t("auth.error"), description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: t("auth.error"), description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: t("auth.error"), description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Store email and password for later account creation after OTP verification
      localStorage.setItem("temp_auth_email", email.trim().toLowerCase());
      localStorage.setItem("temp_auth_password", password);

      const otpCode = generateOtp();
      localStorage.setItem("temp_auth_otp", otpCode);

      console.log("📧 OTP CODE:", otpCode);
      toast({
        title: "OTP Ready",
        description: `Your verification code is ${otpCode}`,
        duration: 10000
      });

      setStep("verify-otp");
    } catch (err: any) {
      console.error("Sign up error:", err);
      localStorage.removeItem("temp_auth_email");
      localStorage.removeItem("temp_auth_password");
      localStorage.removeItem("temp_auth_otp");
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Change
  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }

      if (newOtp.every((d) => d !== "") && index === 5) {
        verifyOtpCode(newOtp.join(""));
      }
    }
  };

  // Handle OTP Key Down
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Verify OTP Code
  const verifyOtpCode = async (code: string) => {
    setLoading(true);
    try {
      const tempEmail = localStorage.getItem("temp_auth_email");
      const tempPassword = localStorage.getItem("temp_auth_password");
      const tempOtp = localStorage.getItem("temp_auth_otp");

      if (!tempEmail || !tempPassword || !tempOtp) {
        throw new Error("Session expired. Please sign up again.");
      }

      if (code !== tempOtp) {
        toast({ title: t("auth.error"), description: "Invalid OTP code", variant: "destructive" });
        setOtp(["", "", "", "", "", ""]);
        setLoading(false);
        return;
      }

      // Try to sign up — works immediately when "Confirm email" is OFF in Supabase
      const { error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
      });

      // Ignore "already registered" — user may be retrying, we'll sign in below
      if (signUpError && !signUpError.message.toLowerCase().includes("already registered")) {
        throw signUpError;
      }

      // Sign in to establish the session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Email confirmation is still enabled in your Supabase project. " +
            "Go to Supabase Dashboard → Authentication → Settings → uncheck \"Enable email confirmations\" and try again."
          );
        }
        throw signInError;
      }

      if (!signInData.user?.id) throw new Error("Login failed after signup");

      // Store user session
      localStorage.setItem("auth_user_id", signInData.user.id);
      localStorage.setItem("auth_user_email", tempEmail);

      // Clear temporary auth data
      localStorage.removeItem("temp_auth_email");
      localStorage.removeItem("temp_auth_password");
      localStorage.removeItem("temp_auth_otp");

      setUserId(signInData.user.id);

      toast({ title: "Success!", description: "OTP verified. Now complete your profile." });
      setStep("profile");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const tempEmail = localStorage.getItem("temp_auth_email");

      if (!tempEmail) {
        throw new Error("Session expired. Please sign up again.");
      }

      const otpCode = generateOtp();
      localStorage.setItem("temp_auth_otp", otpCode);

      console.log("📧 OTP CODE:", otpCode);
      toast({
        title: "OTP Resent!",
        description: `Your new code is ${otpCode}`,
        duration: 10000
      });

      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Submit
  const handleProfileSubmit = async (role: UserRole) => {
    if (!userId) {
      toast({ title: t("auth.error"), description: "User ID not found. Please sign up again.", variant: "destructive" });
      return;
    }

    setSelectedRole(role);
    setLoading(true);
    try {
      let avatarUrl: string | null = null;

      // Upload profile picture if provided
      if (profilePicture) {
        try {
          const fileExt = profilePicture.name.split(".").pop();
          const fileName = `${userId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("profile_pictures")
            .upload(fileName, profilePicture, { upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("profile_pictures")
              .getPublicUrl(fileName);

            avatarUrl = publicUrl;
          } else {
            console.warn("Profile picture upload failed:", uploadError);
            // Continue without avatar if upload fails
          }
        } catch (picError) {
          console.warn("Profile picture upload error:", picError);
          // Continue without avatar if error occurs
        }
      }

      // Ensure the user is signed in before creating the profile
      let { data: currentSession } = await supabase.auth.getSession();
      if (!currentSession?.session) {
        // Retry once after a short delay — session may still be propagating
        await new Promise((r) => setTimeout(r, 500));
        ({ data: currentSession } = await supabase.auth.getSession());
      }
      if (!currentSession?.session) {
        throw new Error("Session lost. Please sign in again.");
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: userId,
        full_name: fullName.trim() || null,
        phone: phone.trim() || "",
        user_type: role,
        avatar_url: avatarUrl,
      }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Store authenticated user
      localStorage.setItem("auth_user_id", userId);
      localStorage.setItem("auth_user_email", email.trim().toLowerCase());

      setStep("complete");
    } catch (err: any) {
      console.error("Profile submit error:", err);
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Handle Picture Change
  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t("auth.error"), description: "Image size must be less than 5MB", variant: "destructive" });
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast({ title: t("auth.error"), description: "Please select a valid image file", variant: "destructive" });
        return;
      }

      setProfilePicture(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 sm:p-6 safe-top flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gradient">MehnatKash</h1>
            <p className="text-xs text-muted-foreground">Find trusted workers</p>
          </div>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      </header>

      <main className="flex-1 container px-4 sm:px-6 py-6 sm:py-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Choice Screen - Login or Sign Up */}
          {step === "choice" && (
            <motion.div
              key="choice"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6 sm:space-y-8"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                </motion.div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome</h2>
                <p className="text-muted-foreground">Choose how you'd like to continue</p>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setStep("login");
                    setEmail("");
                    setPassword("");
                  }}
                  className="w-full h-14 sm:h-16 gradient-primary text-primary-foreground rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 haptic shadow-glow"
                >
                  <Lock className="w-5 h-5" />
                  Sign In
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setStep("signup");
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full h-14 sm:h-16 border-2 border-primary text-primary rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 haptic bg-transparent"
                >
                  <User className="w-5 h-5" />
                  Create Account
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Login Screen */}
          {step === "login" && (
            <motion.div
              key="login"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
                <p className="text-muted-foreground">Welcome back to MehnatKash</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full h-14 pl-14 pr-5 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Password"
                    className="w-full h-14 pl-14 pr-14 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={!email || !password || loading}
                className="w-full h-14 gradient-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed haptic shadow-glow"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              <button
                onClick={() => {
                  setStep("choice");
                  setEmail("");
                  setPassword("");
                }}
                className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </motion.div>
          )}

          {/* Sign Up Screen */}
          {step === "signup" && (
            <motion.div
              key="signup"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                <p className="text-muted-foreground">Join MehnatKash today</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full h-14 pl-14 pr-5 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    className="w-full h-14 pl-14 pr-14 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    placeholder="Confirm password"
                    className="w-full h-14 pl-14 pr-14 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignup}
                disabled={!email || !password || !confirmPassword || loading}
                className="w-full h-14 gradient-primary text-primary-foreground rounded-xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed haptic shadow-glow"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>

              <button
                onClick={() => {
                  setStep("choice");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </motion.div>
          )}

          {/* OTP Verification Screen */}
          {step === "verify-otp" && (
            <motion.div
              key="verify-otp"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
                >
                  <ShieldCheck className="w-10 h-10 text-success" />
                </motion.div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Verify Email</h2>
                <p className="text-muted-foreground">Enter the 6-digit code sent to<br /><span className="font-semibold">{email}</span></p>
              </div>

              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <motion.input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="w-12 h-14 text-center text-2xl font-bold bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              <div className="text-center space-y-3">
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Didn't receive code? Resend
                </button>
                <br />
                <button
                  onClick={() => {
                    setStep("signup");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                  className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {/* Profile Setup Screen */}
          {step === "profile" && (
            <motion.div
              key="profile"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Complete Your Profile</h2>
                <p className="text-muted-foreground">Tell us a bit about yourself</p>
              </div>

              {/* Profile Picture Upload */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer group">
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-border group-hover:border-primary transition-colors">
                    {profilePicturePreview ? (
                      <img src={profilePicturePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePictureChange}
                    disabled={loading}
                    className="hidden"
                  />
                  <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                    <Camera className="w-5 h-5" />
                  </div>
                </label>
              </div>
              <p className="text-center text-xs text-muted-foreground">Add a profile photo (optional)</p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-14 px-5 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                />

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                    <span className="text-base font-semibold">+92</span>
                    <div className="w-px h-6 bg-border" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Phone number"
                    className="w-full h-14 pl-20 pr-5 text-base font-medium bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground text-center">I am a:</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProfileSubmit("customer")}
                  disabled={loading}
                  className="w-full p-5 bg-card rounded-2xl border-2 border-border hover:border-primary transition-colors text-left haptic shadow-card disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">Customer</h3>
                      <p className="text-xs text-muted-foreground">Looking for services</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProfileSubmit("professional")}
                  disabled={loading}
                  className="w-full p-5 bg-card rounded-2xl border-2 border-border hover:border-secondary transition-colors text-left haptic shadow-card disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">Professional</h3>
                      <p className="text-xs text-muted-foreground">Offering services</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Complete Screen */}
          {step === "complete" && (
            <motion.div
              key="complete"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md space-y-6 flex flex-col items-center justify-center min-h-[60vh]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-32 h-32 rounded-full bg-success flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <ShieldCheck className="w-16 h-16 text-success-foreground" />
                </motion.div>
              </motion.div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Account Created!</h2>
                <p className="text-muted-foreground">
                  {selectedRole === "customer"
                    ? "Start exploring services in your area"
                    : "Start offering your services"}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(selectedRole === "customer" ? "/" : "/pro/onboarding")}
                className="px-8 py-4 gradient-primary text-primary-foreground rounded-xl font-bold text-lg haptic shadow-glow"
              >
                {selectedRole === "customer" ? "Start Browsing" : "Set Up Services"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AuthPage;
