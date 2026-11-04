"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import fasilitasData from '../data/fasilitas-vital-yogya.json';

// Trik standar untuk memperbaiki bug icon Leaflet di Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapDashboard() {
  // Titik tengah Kota Yogyakarta
  const position: [number, number] = [-7.7956, 110.3695];

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
      <MapContainer center={position} zoom={13} scrollWheelZoom={true} className="h-full w-full">
        {/* Kita pakai CartoDB Dark Matter biar petanya mode gelap dan futuristik */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Looping 294 data JSON menjadi titik Marker di peta */}
        {fasilitasData.map((item) => (
          <Marker key={item.id} position={[item.lat, item.lng]} icon={customIcon}>
            <Popup>
              <div className="text-slate-800">
                <strong className="block text-sm">{item.name}</strong>
                <span className="text-[10px] px-2 py-0.5 mt-1 inline-block bg-blue-100 text-blue-800 rounded uppercase font-bold tracking-wider">
                  {item.category}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}