import { Check, X, Clock, Loader2, Star, DollarSign, CreditCard } from "@/components/icons/FontAwesomeIcons";

type BookingStatus = "requested" | "accepted" | "rejected" | "in_progress" | "completed" | "rated" | "paid" | "unpaid";

interface StatusBadgeProps {
  status: BookingStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  BookingStatus,
  { icon: React.ElementType; label: string; className: string }
> = {
  requested: {
    icon: Clock,
    label: "Waiting",
    className: "status-requested",
  },
  accepted: {
    icon: Check,
    label: "Accepted",
    className: "status-accepted",
  },
  rejected: {
    icon: X,
    label: "Rejected",
    className: "status-rejected",
  },
  in_progress: {
    icon: Loader2,
    label: "Working",
    className: "status-in-progress",
  },
  completed: {
    icon: Check,
    label: "Done",
    className: "status-completed",
  },
  rated: {
    icon: Star,
    label: "Rated",
    className: "bg-accent text-accent-foreground",
  },
  paid: {
    icon: DollarSign,
    label: "Paid",
    className: "bg-success text-success-foreground",
  },
  unpaid: {
    icon: CreditCard,
    label: "Unpaid",
    className: "bg-destructive/10 text-destructive",
  },
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-base gap-2",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center rounded-full font-semibold ${config.className} ${sizeClasses[size]}`}
    >
      <Icon
        className={`${iconSizes[size]} ${status === "in_progress" ? "animate-spin" : ""}`}
      />
      <span>{config.label}</span>
    </div>
  );
};
