import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="width:16px;height:16px;background:hsl(25,95%,53%);border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(232,118,10,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const proIcon = L.divIcon({
  className: "pro-marker",
  html: `<div style="width:36px;height:36px;background:hsl(175,60%,35%);border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  profession: string;
  rating: number;
  hourlyRate: number;
  isAvailable: boolean;
  distance: string;
}

interface RecenterProps {
  lat: number;
  lng: number;
}

const Recenter = ({ lat, lng }: RecenterProps) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13, { animate: true });
  }, [lat, lng, map]);
  return null;
};

interface ProfessionalMapProps {
  userLat: number;
  userLng: number;
  markers: MapMarker[];
  onMarkerClick: (id: string) => void;
}

const ProfessionalMap = ({ userLat, userLng, markers, onMarkerClick }: ProfessionalMapProps) => {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={13}
      className="w-full h-full rounded-2xl"
      style={{ zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={userLat} lng={userLng} />

      {/* User location */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>
          <div className="text-center text-sm font-semibold">📍 You are here</div>
        </Popup>
      </Marker>

      {/* Professional markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={proIcon}
          eventHandlers={{
            click: () => onMarkerClick(marker.id),
          }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-bold text-sm">{marker.name}</p>
              <p className="text-xs text-gray-500">{marker.profession}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs">⭐ {marker.rating.toFixed(1)}</span>
                <span className="text-xs font-semibold">Rs {marker.hourlyRate}/hr</span>
              </div>
              <p className="text-xs mt-1">{marker.distance} away</p>
              <div className={`text-xs mt-1 ${marker.isAvailable ? "text-green-600" : "text-red-500"}`}>
                {marker.isAvailable ? "● Available" : "● Busy"}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default ProfessionalMap;
export type { MapMarker };
