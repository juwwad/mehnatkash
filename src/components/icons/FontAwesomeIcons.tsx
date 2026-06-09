import { forwardRef, type SVGProps } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowLeft,
  faArrowRight,
  faBars,
  faBell,
  faBellSlash,
  faBolt,
  faBriefcase,
  faCalendarDays,
  faCamera,
  faChartColumn,
  faChartLine,
  faCheck,
  faCheckDouble,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faCircle,
  faCircleCheck,
  faCircleInfo,
  faClock,
  faCommentDots,
  faComments,
  faCreditCard,
  faDollarSign,
  faDownload,
  faDroplet,
  faEllipsis,
  faEnvelope,
  faEye,
  faEyeSlash,
  faFan,
  faGear,
  faGlobe,
  faGripLinesVertical,
  faHammer,
  faHouse,
  faImage,
  faList,
  faLock,
  faMagnifyingGlass,
  faLocationArrow,
  faLocationDot,
  faMobileScreen,
  faMoon,
  faPaintbrush,
  faPen,
  faPenToSquare,
  faPhone,
  faPlus,
  faRightFromBracket,
  faRightToBracket,
  faShieldHalved,
  faShieldHeart,
  faSpinner,
  faStar,
  faSun,
  faToggleOff,
  faToggleOn,
  faTrash,
  faUser,
  faUsers,
  faWandMagicSparkles,
  faWrench,
  faXmark,
  faMap as faMapIcon,
} from "@fortawesome/free-solid-svg-icons";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

const createIcon = (icon: IconDefinition, spin = false) =>
  forwardRef<SVGSVGElement, IconProps>(
    ({ className, strokeWidth, absoluteStrokeWidth, size, ...props }, ref) => (
      <FontAwesomeIcon
        ref={ref}
        icon={icon}
        className={className}
        spin={spin}
        {...props}
      />
    ),
  );

export const ArrowLeft = createIcon(faArrowLeft);
export const ArrowRight = createIcon(faArrowRight);
export const BarChart3 = createIcon(faChartColumn);
export const Bell = createIcon(faBell);
export const BellOff = createIcon(faBellSlash);
export const Briefcase = createIcon(faBriefcase);
export const Calendar = createIcon(faCalendarDays);
export const Camera = createIcon(faCamera);
export const Check = createIcon(faCheck);
export const CheckCheck = createIcon(faCheckDouble);
export const CheckCircle = createIcon(faCircleCheck);
export const CheckCircle2 = createIcon(faCircleCheck);
export const ChevronDown = createIcon(faChevronDown);
export const ChevronLeft = createIcon(faChevronLeft);
export const ChevronRight = createIcon(faChevronRight);
export const ChevronUp = createIcon(faChevronUp);
export const Circle = createIcon(faCircle);
export const Clock = createIcon(faClock);
export const Cog = createIcon(faGear);
export const CreditCard = createIcon(faCreditCard);
export const DollarSign = createIcon(faDollarSign);
export const Dot = createIcon(faCircle);
export const Download = createIcon(faDownload);
export const Droplets = createIcon(faDroplet);
export const Edit2 = createIcon(faPenToSquare);
export const Edit3 = createIcon(faPen);
export const Eye = createIcon(faEye);
export const EyeOff = createIcon(faEyeSlash);
export const Fan = createIcon(faFan);
export const Globe = createIcon(faGlobe);
export const GripVertical = createIcon(faGripLinesVertical);
export const Hammer = createIcon(faHammer);
export const Home = createIcon(faHouse);
export const Image = createIcon(faImage);
export const Info = createIcon(faCircleInfo);
export const List = createIcon(faList);
export const Loader2 = createIcon(faSpinner, true);
export const Lock = createIcon(faLock);
export const LogIn = createIcon(faRightToBracket);
export const LogOut = createIcon(faRightFromBracket);
export const Mail = createIcon(faEnvelope);
export const Map = createIcon(faMapIcon);
export const MapPin = createIcon(faLocationDot);
export const MessageCircle = createIcon(faComments);
export const MessageSquare = createIcon(faCommentDots);
export const Moon = createIcon(faMoon);
export const MoreHorizontal = createIcon(faEllipsis);
export const Navigation = createIcon(faLocationArrow);
export const Paintbrush = createIcon(faPaintbrush);
export const PanelLeft = createIcon(faBars);
export const Phone = createIcon(faPhone);
export const Plus = createIcon(faPlus);
export const Search = createIcon(faMagnifyingGlass);
export const Send = createIcon(faLocationArrow);
export const Settings = createIcon(faGear);
export const Shield = createIcon(faShieldHalved);
export const ShieldCheck = createIcon(faShieldHeart);
export const Smartphone = createIcon(faMobileScreen);
export const Sparkles = createIcon(faWandMagicSparkles);
export const Star = createIcon(faStar);
export const Sun = createIcon(faSun);
export const ToggleLeft = createIcon(faToggleOff);
export const ToggleRight = createIcon(faToggleOn);
export const Trash2 = createIcon(faTrash);
export const TrendingUp = createIcon(faChartLine);
export const User = createIcon(faUser);
export const Users = createIcon(faUsers);
export const Wrench = createIcon(faWrench);
export const X = createIcon(faXmark);
export const Zap = createIcon(faBolt);
