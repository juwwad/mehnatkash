import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, List, Map as MapIcon, Navigation, Loader2 } from "@/components/icons/FontAwesomeIcons";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProfessionalCard } from "@/components/ui/ProfessionalCard";
import { BottomNav } from "@/components/ui/BottomNav";
import { useGeolocation, getDistance } from "@/hooks/useGeolocation";
import { useUserRole } from "@/hooks/useUserRole";
import type { MapMarker } from "@/components/ui/ProfessionalMap";

const ProfessionalMap = lazy(() => import("@/components/ui/ProfessionalMap"));

interface Service {
  id: string;
  name: string;
  type: string;
}

interface Professional {
  id: string;
  user_id: string;
  hourly_rate: number;
  rating: number;
  review_count: number;
  is_available: boolean;
  is_verified: boolean;
  location_city: string;
  location_lat: number | null;
  location_lng: number | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  services: {
    name: string;
  } | null;
}

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userType } = useUserRole();
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(
    searchParams.get("service")
  );

  const { latitude, longitude, isLoading: geoLoading } = useGeolocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: servicesData } = await supabase
          .from("services")
          .select("id, name, type")
          .eq("is_active", true);

        setServices(servicesData || []);

        let query = supabase
          .from("professionals")
          .select(`
            id,
            user_id,
            hourly_rate,
            rating,
            review_count,
            is_available,
            is_verified,
            location_city,
            location_lat,
            location_lng,
            service_id,
            profiles!professionals_profile_id_fkey (full_name, avatar_url),
            services (name)
          `)
          // Include records that are either marked available or are verified.
          // Some existing rows may have `is_available` null/false but are verified,
          // so include those to ensure verified professionals appear in search.
          .or('is_available.eq.true,is_verified.eq.true')
          .order("rating", { ascending: false });

        if (selectedService) {
          const serviceRecord = servicesData?.find((s) => s.type === selectedService);
          if (serviceRecord) {
            query = query.eq("service_id", serviceRecord.id);
          }
        }

        const { data: professionalsData } = await query;
        setProfessionals(professionalsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedService]);

  const handleServiceSelect = (type: string) => {
    if (selectedService === type) {
      setSelectedService(null);
      setSearchParams({});
    } else {
      setSelectedService(type);
      setSearchParams({ service: type });
    }
  };

  // Calculate distances and sort
  const professionalsWithDistance = useMemo(() => {
    return professionals
      .map((pro) => {
        let distance: number | null = null;
        if (latitude && longitude && pro.location_lat && pro.location_lng) {
          distance = getDistance(latitude, longitude, pro.location_lat, pro.location_lng);
        }
        return { ...pro, distance };
      })
      .filter((pro) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          pro.profiles?.full_name?.toLowerCase().includes(q) ||
          pro.services?.name?.toLowerCase().includes(q) ||
          pro.location_city?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });
  }, [professionals, latitude, longitude, searchQuery]);

  const formatDistance = (km: number | null): string => {
    if (km === null) return "Unknown";
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)} km`;
  };

  // Map markers
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      professionalsWithDistance
        .filter((p) => p.location_lat && p.location_lng)
        .map((p) => ({
          id: p.id,
          lat: p.location_lat!,
          lng: p.location_lng!,
          name: p.profiles?.full_name || "Worker",
          profession: p.services?.name || "Professional",
          rating: Number(p.rating) || 0,
          hourlyRate: p.hourly_rate,
          isAvailable: p.is_available,
          distance: formatDistance(p.distance),
        })),
    [professionalsWithDistance]
  );

  return (
    <div className="min-h-screen bg-background safe-bottom text-sm sm:text-base">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-40 glass border-b border-border safe-top"
      >
        <div className="container py-3 sm:py-4 space-y-2 sm:space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workers, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 bg-muted rounded-xl border-2 border-transparent focus:border-primary focus:outline-none text-foreground text-sm sm:text-base"
            />
          </div>

          {/* Location + View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {geoLoading ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : (
                <Navigation className="w-4 h-4 text-primary" />
              )}
              <span>{geoLoading ? "Detecting location..." : "Near you"}</span>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "map"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Map
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Services filter */}
      <div className="container pt-3 sm:pt-4 pb-2">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
          {services.map((service, index) => (
            <motion.button
              key={service.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleServiceSelect(service.type)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-colors haptic ${
                selectedService === service.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground border border-border"
              }`}
            >
              {service.name}
              {selectedService === service.type && <X className="w-4 h-4" />}
            </motion.button>
          ))}
        </div>
      </div>

      <main className="container py-3 sm:py-4">
        <AnimatePresence mode="wait">
          {viewMode === "map" ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-280px)] rounded-2xl overflow-hidden border border-border relative"
            >
              {latitude && longitude ? (
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  }
                >
                  <ProfessionalMap
                    userLat={latitude}
                    userLng={longitude}
                    markers={mapMarkers}
                    onMarkerClick={(id) => navigate(`/professional/${id}`)}
                  />
                </Suspense>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Getting your location...</p>
                  </div>
                </div>
              )}

              {/* Floating count */}
              <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-4 py-3 shadow-elevated">
                  <p className="text-sm font-medium text-foreground">
                    {mapMarkers.length} worker{mapMarkers.length !== 1 ? "s" : ""} nearby
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 sm:space-y-4"
            >
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-card rounded-3xl p-6 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-32 bg-muted rounded" />
                          <div className="h-4 w-24 bg-muted rounded" />
                          <div className="h-4 w-40 bg-muted rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : professionalsWithDistance.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">No workers found</h3>
                  <p className="text-muted-foreground text-sm">
                    {selectedService
                      ? "Try a different service or clear the filter"
                      : "No verified workers available yet"}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {professionalsWithDistance.length} worker
                    {professionalsWithDistance.length !== 1 ? "s" : ""} found
                    {latitude ? " • sorted by distance" : ""}
                  </p>
                  {professionalsWithDistance.map((pro, index) => (
                    <motion.div
                      key={pro.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProfessionalCard
                        id={pro.id}
                        name={pro.profiles?.full_name || "Unknown"}
                        photo={pro.profiles?.avatar_url || ""}
                        profession={pro.services?.name || "Professional"}
                        rating={Number(pro.rating) || 0}
                        reviewCount={pro.review_count}
                        distance={formatDistance(pro.distance)}
                        hourlyRate={pro.hourly_rate}
                        isAvailable={pro.is_available}
                        isVerified={pro.is_verified}
                        onClick={() => navigate(`/professional/${pro.id}`)}
                      />
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav userType={userType || "customer"} />
    </div>
  );
};

export default SearchPage;
