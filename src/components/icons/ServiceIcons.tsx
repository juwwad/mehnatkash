import { Zap, Wrench, Droplets, Hammer, Paintbrush, Fan, Cog } from "@/components/icons/FontAwesomeIcons";

export const ElectricianIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Zap className="w-full h-full text-primary" strokeWidth={2.5} />
  </div>
);

export const PlumberIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Droplets className="w-full h-full text-info" strokeWidth={2.5} />
  </div>
);

export const CarpenterIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Hammer className="w-full h-full text-warning" strokeWidth={2.5} />
  </div>
);

export const PainterIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Paintbrush className="w-full h-full text-success" strokeWidth={2.5} />
  </div>
);

export const ACRepairIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Fan className="w-full h-full text-secondary" strokeWidth={2.5} />
  </div>
);

export const MechanicIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <Cog className="w-full h-full text-muted-foreground" strokeWidth={2.5} />
  </div>
);

export const ServiceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  electrician: ElectricianIcon,
  plumber: PlumberIcon,
  carpenter: CarpenterIcon,
  painter: PainterIcon,
  ac_repair: ACRepairIcon,
  mechanic: MechanicIcon,
};

export const getServiceIcon = (serviceType: string) => {
  return ServiceIconMap[serviceType.toLowerCase()] || Wrench;
};
