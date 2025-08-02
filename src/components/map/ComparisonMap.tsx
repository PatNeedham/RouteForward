"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, GeoJSON, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import pako from "pako";

// Data
import hblrData from "@/data/jersey-city/hblr.json";
import streetNetworkData from "@/data/jersey-city/street-network.json";

// Components
import TimeSlider from "./TimeSlider";

// Leaflet Icon workaround
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

interface ComparisonMapProps {
  city: string;
}

const trafficColorMapping: { [key: string]: string } = {
  heavy: "#dc2626", // red-600
  medium: "#f59e0b", // amber-500
  light: "#facc15", // yellow-400
};

const ComparisonMap: React.FC<ComparisonMapProps> = ({ city }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [simTime, setSimTime] = useState("08:00");
  const [newRoutes, setNewRoutes] = useState<any>({
    type: "FeatureCollection",
    features: [],
  });

  // Decode routes from URL on initial load
  useEffect(() => {
    const routesParam = searchParams.get("routes");
    if (routesParam) {
      try {
        const decoded = atob(routesParam);
        const decompressed = pako.inflate(decoded, { to: "string" });
        setNewRoutes(JSON.parse(decompressed));
      } catch (error) {
        console.error("Failed to decode routes from URL:", error);
      }
    }
  }, [searchParams]);

  // Update URL when routes change
  const updateUrlWithRoutes = useCallback((routes: any) => {
    if (routes.features.length > 0) {
      const jsonString = JSON.stringify(routes);
      const compressed = pako.deflate(jsonString, { to: "string" });
      const encoded = btoa(compressed);
      const params = new URLSearchParams(searchParams.toString());
      params.set("routes", encoded);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [router, pathname, searchParams]);

  const position: [number, number] = [40.7282, -74.0776];

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(feature.properties.name);
    }
  };

  const getTrafficLevel = (feature: any) => {
    if (!feature.properties.traffic) return 'light';
    const times = Object.keys(feature.properties.traffic).sort();
    let applicableTime = times[0];
    for (const time of times) {
      if (simTime >= time) {
        applicableTime = time;
      } else {
        break;
      }
    }
    return feature.properties.traffic[applicableTime];
  }

  const streetNetworkStyle = (feature: any) => {
    const trafficLevel = getTrafficLevel(feature);
    return {
      color: trafficColorMapping[trafficLevel] || "#ffffff",
      weight: 4,
      opacity: 0.9,
    };
  };
  
  const hblrStyle = { color: "#00AEEF", weight: 3, opacity: 0.8 };
  const newRouteStyle = { color: "#32CD32", weight: 5, opacity: 1 };

  const _onCreate = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === "polyline") {
      const geojson = layer.toGeoJSON();
      const updatedRoutes = {
        ...newRoutes,
        features: [...newRoutes.features, geojson],
      };
      setNewRoutes(updatedRoutes);
      updateUrlWithRoutes(updatedRoutes);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full w-full p-4">
        {/* Current State Map */}
        <div className="flex flex-col h-full rounded-lg overflow-hidden">
          <h2 className="text-center text-xl font-bold mb-2 flex-shrink-0">Current State</h2>
          <div className="flex-grow relative">
            <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <GeoJSON key={simTime} data={streetNetworkData as any} style={streetNetworkStyle} onEachFeature={onEachFeature} />
              <GeoJSON data={hblrData as any} style={hblrStyle} onEachFeature={onEachFeature} />
            </MapContainer>
          </div>
        </div>

        {/* Enhanced Transit Map */}
        <div className="flex flex-col h-full rounded-lg overflow-hidden">
          <h2 className="text-center text-xl font-bold mb-2 flex-shrink-0">Enhanced Transit</h2>
          <div className="flex-grow relative">
            <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
              <FeatureGroup>
                <EditControl
                  position="topright"
                  onCreated={_onCreate}
                  draw={{ rectangle: false, polygon: false, circle: false, circlemarker: false, marker: false }}
                />
              </FeatureGroup>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <GeoJSON key={simTime} data={streetNetworkData as any} style={streetNetworkStyle} onEachFeature={onEachFeature} />
              <GeoJSON data={hblrData as any} style={hblrStyle} onEachFeature={onEachFeature} />
              <GeoJSON data={newRoutes} style={newRouteStyle} />
            </MapContainer>
          </div>
        </div>
      </div>
      <TimeSlider onChange={setSimTime} />
    </>
  );
};

export default ComparisonMap;

