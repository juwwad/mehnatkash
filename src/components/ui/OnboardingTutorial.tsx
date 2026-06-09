import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Star, Shield, MapPin, X } from "@/components/icons/FontAwesomeIcons";
import { Button } from "@/components/ui/button";

interface Step {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: "Find Workers Near You",
    description: "Search for electricians, plumbers, and other skilled workers in your area. Filter by service, rating, and availability.",
    color: "bg-primary",
  },
  {
    icon: MapPin,
    title: "View on Map",
    description: "See nearby professionals on a live map. Tap any marker to view their profile, ratings, and hourly rate.",
    color: "bg-secondary",
  },
  {
    icon: MessageCircle,
    title: "Chat & Book",
    description: "Message professionals directly, discuss your job, and book them instantly. Track your booking status in real-time.",
    color: "bg-info",
  },
  {
    icon: Star,
    title: "Rate & Review",
    description: "After the job is done, rate your experience. Your feedback helps other customers find the best workers.",
    color: "bg-accent",
  },
  {
    icon: Shield,
    title: "Verified & Trusted",
    description: "Look for the verified badge. We check worker identities so you can hire with confidence.",
    color: "bg-success",
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-sm bg-card rounded-3xl shadow-elevated overflow-hidden"
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon area */}
        <div className={`${step.color} p-8 flex items-center justify-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 15 }}
          >
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
              <Icon className="w-12 h-12 text-white" strokeWidth={1.5} />
            </div>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-bold text-foreground mb-2"
          >
            {step.title}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-muted-foreground leading-relaxed mb-6"
          >
            {step.description}
          </motion.p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-6 bg-primary"
                    : i < currentStep
                    ? "w-2 bg-primary/40"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!isLast && (
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {isLast ? "Get Started!" : "Next"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
