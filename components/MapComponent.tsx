import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { MapMarker, Location } from '../types';
import { Star } from 'lucide-react';

// Fix for default Leaflet marker icons not appearing in React
// We must use CDN URLs because we cannot import .png files directly in this environment
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  center: Location;
  zoom: number;
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerClick: (marker: MapMarker) => void;
  isDarkMode: boolean;
  mapLayer: 'street' | 'satellite';
}

const ChangeView: React.FC<{ center: Location; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
};

const FitBounds: React.FC<{ markers: MapMarker[] }> = ({ markers }) => {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, map]);
    return null;
}

// Helper to create custom div icons using Tailwind classes
const createCustomIcon = (type: string) => {
    let colorClass = 'bg-blue-500';
    let iconHtml = '';
    
    switch (type) {
        case 'origin':
            colorClass = 'bg-green-600';
            iconHtml = '<span class="text-white font-bold text-[10px]">A</span>';
            break;
        case 'destination':
            colorClass = 'bg-red-600';
            iconHtml = '<span class="text-white font-bold text-[10px]">B</span>';
            break;
        case 'poi':
            colorClass = 'bg-purple-500';
            iconHtml = '';
            break;
        default:
            colorClass = 'bg-blue-500';
    }

    const isPoi = type === 'poi';
    const size = isPoi ? 12 : 24;

    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="${colorClass} w-full h-full rounded-full border-2 border-white shadow-lg flex items-center justify-center">${iconHtml}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -size/2]
    });
};

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, markers, onMarkerClick, isDarkMode, mapLayer }) => {
  
  // Calculate route line if origin and destination exist
  const routePositions = useMemo(() => {
      const origin = markers.find(m => m.type === 'origin');
      const dest = markers.find(m => m.type === 'destination');
      if (origin && dest) {
          return [
              [origin.lat, origin.lng],
              [dest.lat, dest.lng]
          ] as L.LatLngExpression[];
      }
      return null;
  }, [markers]);

  // Dynamic Tile Configuration
  let tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  let tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  if (mapLayer === 'satellite') {
      tileLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      tileAttribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  } else if (isDarkMode) {
      tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  }

  return (
    <MapContainer 
      center={[center.lat, center.lng]} 
      zoom={zoom} 
      style={{ 
        height: "100%", 
        width: "100%", 
        zIndex: 0, 
        background: isDarkMode ? '#1a1a1a' : '#f8fafc' 
      }}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution={tileAttribution}
        url={tileLayerUrl}
        maxZoom={19}
      />
      <ChangeView center={center} zoom={zoom} />
      <FitBounds markers={markers} />
      
      {/* Current User Location Marker */}
       <Marker 
         position={[center.lat, center.lng]}
         icon={L.divIcon({
             className: 'custom-user-location',
             html: `<div style="background-color: ${isDarkMode && mapLayer !== 'satellite' ? '#60a5fa' : '#3b82f6'}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
             iconSize: [16, 16],
             iconAnchor: [8, 8]
         })}
       >
         <Popup>You are here</Popup>
       </Marker>

      {/* Route Line */}
      {routePositions && (
          <Polyline 
            positions={routePositions} 
            pathOptions={{ 
                color: isDarkMode && mapLayer !== 'satellite' ? '#60a5fa' : '#3b82f6', 
                dashArray: '10, 10', 
                weight: 4, 
                opacity: 0.8 
            }} 
          />
      )}

      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={[marker.lat, marker.lng]}
          icon={createCustomIcon(marker.type || 'default')}
          eventHandlers={{
            click: () => onMarkerClick(marker),
          }}
        >
          <Popup className={isDarkMode ? 'dark-popup' : ''}>
            <div className={`text-sm font-sans min-w-[150px] ${isDarkMode ? 'text-gray-800' : 'text-gray-900'}`}>
              <div className="flex items-center justify-between mb-1">
                 <strong className="block text-base">{marker.name}</strong>
                 <div className="flex items-center gap-1">
                     {marker.rating && (
                         <span className="flex items-center gap-0.5 text-amber-500 font-bold text-xs bg-amber-50 px-1 rounded border border-amber-100">
                             {marker.rating} <Star size={8} fill="currentColor" />
                         </span>
                     )}
                     {marker.distance && (
                         <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium border border-gray-200">
                             {marker.distance}
                         </span>
                     )}
                 </div>
              </div>
              <p className="m-0 text-gray-600 leading-snug">{marker.description}</p>
              {marker.type === 'poi' && (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wider text-purple-600 font-bold">
                      Nearby Interest
                  </span>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;