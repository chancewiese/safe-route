// web/src/components/LeafletMap.jsx
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LeafletMap.css";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const LeafletMap = ({
  settings,
  locations,
  startInputRef,
  endInputRef,
  onLocationChange,
  route,
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [crimeHeatmap, setCrimeHeatmap] = useState(null);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Create map centered on US
    const leafletMap = L.map(mapRef.current).setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(leafletMap);

    setMap(leafletMap);

    // Cleanup function
    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, []);

  // Handle location search (simple geocoding with Nominatim)
  const searchLocation = async (query, type) => {
    if (!query.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&countrycodes=us`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Update location
        onLocationChange(type, result.display_name);

        // Add marker
        if (type === "start") {
          // Remove existing start marker
          if (startMarker) {
            map.removeLayer(startMarker);
          }

          const marker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl:
                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
            }),
          }).addTo(map);

          marker.bindPopup("Start Location").openPopup();
          setStartMarker(marker);

          // Center map on location
          map.setView([lat, lng], 13);
        } else if (type === "end") {
          // Remove existing end marker
          if (endMarker) {
            map.removeLayer(endMarker);
          }

          const marker = L.marker([lat, lng], {
            icon: L.icon({
              iconUrl:
                "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
            }),
          }).addTo(map);

          marker.bindPopup("Destination").openPopup();
          setEndMarker(marker);
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Handle route display when route data changes
  useEffect(() => {
    if (!map || !route || !route.startCoords || !route.endCoords) return;

    // Remove existing markers and route
    if (startMarker) {
      map.removeLayer(startMarker);
    }
    if (endMarker) {
      map.removeLayer(endMarker);
    }
    if (routeLine) {
      map.removeLayer(routeLine);
    }

    // Add start marker
    const newStartMarker = L.marker(
      [route.startCoords.lat, route.startCoords.lng],
      {
        icon: L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        }),
      }
    ).addTo(map);
    newStartMarker.bindPopup("Start Location");
    setStartMarker(newStartMarker);

    // Add end marker
    const newEndMarker = L.marker([route.endCoords.lat, route.endCoords.lng], {
      icon: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    }).addTo(map);
    newEndMarker.bindPopup("Destination");
    setEndMarker(newEndMarker);

    // Add route line
    const routeCoords = [
      [route.startCoords.lat, route.startCoords.lng],
      [route.endCoords.lat, route.endCoords.lng],
    ];

    const line = L.polyline(routeCoords, {
      color:
        route.safetyScore >= 70
          ? "#10b981"
          : route.safetyScore >= 40
          ? "#f59e0b"
          : "#ef4444",
      weight: 6,
      opacity: 0.8,
    }).addTo(map);
    setRouteLine(line);

    // Fit map to show entire route
    const group = L.featureGroup([newStartMarker, newEndMarker, line]);
    map.fitBounds(group.getBounds().pad(0.1));

    console.log("Route displayed on map");
  }, [route, map]);

  // Display crime data based on settings
  useEffect(() => {
    if (!map) return;

    // Remove existing crime visualization
    if (crimeHeatmap) {
      map.removeLayer(crimeHeatmap);
      setCrimeHeatmap(null);
    }

    // Add crime data visualization based on display mode
    if (
      settings.displayMode === "heatmap" ||
      settings.displayMode === "points"
    ) {
      // Mock crime data for demonstration
      const mockCrimeData = [
        { lat: 34.0522, lng: -118.2437, intensity: 0.8 },
        { lat: 34.0622, lng: -118.2537, intensity: 0.6 },
        { lat: 34.0422, lng: -118.2337, intensity: 0.9 },
        { lat: 34.0722, lng: -118.2637, intensity: 0.4 },
        { lat: 34.0822, lng: -118.2737, intensity: 0.7 },
        { lat: 34.0322, lng: -118.2237, intensity: 0.5 },
      ];

      if (settings.displayMode === "heatmap") {
        // Show as heatmap - requires leaflet.heat plugin
        // For now, we'll simulate with colored circles
        const heatmapMarkers = mockCrimeData.map((crime) =>
          L.circle([crime.lat, crime.lng], {
            radius: 200 * crime.intensity,
            fillColor:
              crime.intensity > 0.7
                ? "#ef4444"
                : crime.intensity > 0.5
                ? "#f59e0b"
                : "#eab308",
            color: "transparent",
            weight: 0,
            opacity: 0,
            fillOpacity: 0.3 + crime.intensity * 0.4,
          })
        );

        const heatmapGroup = L.layerGroup(heatmapMarkers).addTo(map);
        setCrimeHeatmap(heatmapGroup);
      } else if (settings.displayMode === "points") {
        // Show as individual points
        const crimeMarkers = mockCrimeData.map((crime) =>
          L.circleMarker([crime.lat, crime.lng], {
            radius: 8,
            fillColor:
              crime.intensity > 0.7
                ? "#ef4444"
                : crime.intensity > 0.5
                ? "#f59e0b"
                : "#eab308",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }).bindPopup(
            `Crime Intensity: ${(crime.intensity * 100).toFixed(0)}%`
          )
        );

        const crimeGroup = L.layerGroup(crimeMarkers).addTo(map);
        setCrimeHeatmap(crimeGroup);
      }
    }
  }, [settings.displayMode, map]);

  return (
    <div className="leaflet-map-container">
      {/* Map Container */}
      <div ref={mapRef} className="leaflet-map" />

      {/* Map Controls */}
      <div className="map-controls">
        <div className="control-group">
          <h4 className="control-title">Display Mode</h4>
          <label>
            <input
              type="radio"
              name="displayMode"
              value="map"
              checked={settings.displayMode === "map"}
              onChange={(e) => {
                const newSettings = {
                  ...settings,
                  displayMode: e.target.value,
                };
                onLocationChange("settings", newSettings);
              }}
            />
            Clean Map
          </label>
          <label>
            <input
              disabled
              type="radio"
              name="displayMode"
              value="heatmap"
              checked={settings.displayMode === "heatmap"}
              onChange={(e) => {
                const newSettings = {
                  ...settings,
                  displayMode: e.target.value,
                };
                onLocationChange("settings", newSettings);
              }}
            />
            Crime Heatmap
          </label>
          <label>
            <input
              disabled
              type="radio"
              name="displayMode"
              value="points"
              checked={settings.displayMode === "points"}
              onChange={(e) => {
                const newSettings = {
                  ...settings,
                  displayMode: e.target.value,
                };
                onLocationChange("settings", newSettings);
              }}
            />
            Crime Points
          </label>
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
