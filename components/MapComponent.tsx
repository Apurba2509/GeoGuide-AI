import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { MapMarker, Location } from '../types';

// Fix for default Leaflet marker icons not appearing in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  center: Location;
  zoom: number;
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerClick: (marker: MapMarker) => void;
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

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, markers, onMarkerClick }) => {
  
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

  return (
    <MapContainer 
      center={[center.lat, center.lng]} 
      zoom={zoom} 
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={center} zoom={zoom} />
      <FitBounds markers={markers} />
      
      {/* Current User Location Marker */}
       <Marker 
         position={[center.lat, center.lng]}
         icon={L.divIcon({
             className: 'custom-user-location',
             html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
             iconSize: [16, 16],
             iconAnchor: [8, 8]
         })}
       >
         <Popup>You are here</Popup>
       </Marker>

      {/* Route Line (Straight line visualization) */}
      {routePositions && (
          <Polyline 
            positions={routePositions} 
            pathOptions={{ color: '#3b82f6', dashArray: '10, 10', weight: 4, opacity: 0.7 }} 
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
          <Popup>
            <div className="text-sm font-sans min-w-[150px]">
              <div className="flex items-center justify-between mb-1">
                 <strong className="block text-base">{marker.name}</strong>
                 {marker.distance && (
                     <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                         {marker.distance}
                     </span>
                 )}
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