import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Droplets,
  MapPin,
} from "@/components/icons/FontAwesomeIcons";
import { RatingStars } from "@/components/ui/RatingStars";

type OnboardingStep = "photo" | "profession" | "skills" | "rate" | "location" | "complete";

const professions = [
  { id: "electrician", name: "Electrician", icon: Zap, color: "text-primary" },
  { id: "plumber", name: "Plumber", icon: Droplets, color: "text-info" },
];

const electricianSkills = [
  "Wiring",
  "Fan Repair",
  "AC Install",
  "Light Fixing",
  "Motor Repair",
  "Generator",
];

const plumberSkills = [
  "Pipe Repair",
  "Tap Fixing",
  "Drain Clean",
  "Toilet Repair",
  "Water Tank",
  "Geyser",
];

const ProOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("photo");
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(500);

  const steps: OnboardingStep[] = ["photo", "profession", "skills", "rate", "location", "complete"];
  const currentIndex = steps.indexOf(step);

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  const availableSkills =
    selectedProfession === "electrician" ? electricianSkills : plumberSkills;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 safe-top flex items-center justify-between">
        {currentIndex > 0 && step !== "complete" ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goBack}
            className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center haptic"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </motion.button>
        ) : (
          <div className="w-12" />
        )}

        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">Set Up Profile</h1>
          <p className="text-xs text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="w-12" />
      </header>

      {/* Progress Bar */}
      <div className="px-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Photo Step */}
          {step === "photo" && (
            <motion.div
              key="photo"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8 text-center"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Add Photo</h2>
                <p className="text-muted-foreground">Customers trust workers with photos</p>
              </div>

              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mx-auto w-40 h-40 rounded-full bg-muted border-4 border-dashed border-primary/30 flex items-center justify-center overflow-hidden haptic"
                >
                  {photo ? (
                    <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-primary" />
                  )}
                </motion.div>
              </label>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                disabled={!photo}
                className="w-full h-16 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 haptic shadow-glow"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              <button onClick={goNext} className="text-sm text-muted-foreground">
                Skip for now
              </button>
            </motion.div>
          )}

          {/* Profession Step */}
          {step === "profession" && (
            <motion.div
              key="profession"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">What do you do?</h2>
                <p className="text-muted-foreground">Select your profession</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {professions.map((prof) => {
                  const Icon = prof.icon;
                  const isSelected = selectedProfession === prof.id;

                  return (
                    <motion.button
                      key={prof.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedProfession(prof.id)}
                      className={`aspect-square rounded-3xl border-2 flex flex-col items-center justify-center gap-3 haptic transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-glow"
                          : "border-border bg-card"
                      }`}
                    >
                      <Icon className={`w-16 h-16 ${prof.color}`} />
                      <span className="font-bold text-foreground">{prof.name}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                disabled={!selectedProfession}
                className="w-full h-16 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 haptic shadow-glow"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Skills Step */}
          {step === "skills" && (
            <motion.div
              key="skills"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Your Skills</h2>
                <p className="text-muted-foreground">Select what you can do</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);

                  return (
                    <motion.button
                      key={skill}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleSkill(skill)}
                      className={`p-4 rounded-2xl border-2 font-semibold haptic transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      {skill}
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                disabled={selectedSkills.length === 0}
                className="w-full h-16 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 haptic shadow-glow"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Rate Step */}
          {step === "rate" && (
            <motion.div
              key="rate"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Set Your Rate</h2>
                <p className="text-muted-foreground">How much per hour?</p>
              </div>

              <div className="text-center space-y-4">
                <div className="inline-flex items-baseline gap-2 price-tag px-8 py-4 rounded-2xl">
                  <span className="text-2xl font-bold">Rs</span>
                  <span className="text-5xl font-extrabold">{hourlyRate}</span>
                  <span className="text-lg opacity-70">/hr</span>
                </div>

                <input
                  type="range"
                  min="200"
                  max="1500"
                  step="50"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full h-3 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
                />

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Rs 200</span>
                  <span>Rs 1,500</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                className="w-full h-16 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-3 haptic shadow-glow"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Location Step */}
          {step === "location" && (
            <motion.div
              key="location"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Your Location</h2>
                <p className="text-muted-foreground">So customers can find you</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <MapPin className="w-16 h-16 text-primary" />
                </motion.div>

                <div className="text-center">
                  <p className="font-bold text-foreground text-lg">Peshawar</p>
                  <p className="text-sm text-muted-foreground">Location detected</p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={goNext}
                className="w-full h-16 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-3 haptic shadow-glow"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {/* Complete Step */}
          {step === "complete" && (
            <motion.div
              key="complete"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="w-32 h-32 rounded-full gradient-success flex items-center justify-center"
              >
                <Check className="w-16 h-16 text-success-foreground" />
              </motion.div>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Profile Complete!</h2>
                <p className="text-muted-foreground">You're ready to get jobs</p>
              </div>

              <div className="flex gap-1">
                <RatingStars rating={0} size="lg" />
              </div>
              <p className="text-sm text-muted-foreground">Start earning 5 stars!</p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/pro/dashboard")}
                className="px-8 py-4 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg haptic shadow-glow"
              >
                Go to Dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ProOnboarding;
