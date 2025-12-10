import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, markers, onMarkerClick }) => {
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
      
      {/* Current User Location Marker - Blue Dot */}
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

      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={[marker.lat, marker.lng]}
          eventHandlers={{
            click: () => onMarkerClick(marker),
          }}
        >
          <Popup>
            <div className="text-sm font-sans">
              <strong className="block text-base mb-1">{marker.name}</strong>
              <p className="m-0 text-gray-600">{marker.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;