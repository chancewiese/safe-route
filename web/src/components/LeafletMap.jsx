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
  const [crimeData, setCrimeData] = useState([]);

  // Loading states
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLoadingCrimeData, setIsLoadingCrimeData] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current || map) return;

    try {
      console.log("Initializing map...");
      setIsMapLoading(true);

      // Create map centered on US
      const leafletMap = L.map(mapRef.current).setView([39.8283, -98.5795], 4);

      // Add OpenStreetMap tiles
      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      );

      // Handle tile loading
      tileLayer.on("loading", () => {
        console.log("Map tiles loading...");
      });

      tileLayer.on("load", () => {
        console.log("Map tiles loaded!");
        setIsMapLoading(false);
        setMapError(null);
      });

      tileLayer.on("tileerror", (error) => {
        console.error("Tile loading error:", error);
        setMapError(
          "Failed to load map tiles. Please check your internet connection."
        );
        setIsMapLoading(false);
      });

      tileLayer.addTo(leafletMap);
      setMap(leafletMap);

      // Set loading to false after a timeout as backup
      setTimeout(() => {
        setIsMapLoading(false);
      }, 5000);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Failed to initialize map. Please refresh the page.");
      setIsMapLoading(false);
    }

    // Cleanup function
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Fetch real crime data from API
  const fetchCrimeData = async () => {
    setIsLoadingCrimeData(true);
    try {
      console.log("Fetching crime data from API...");
      const response = await fetch("/api/crime-data");

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Crime data received:", data);

      if (data.crimeData && Array.isArray(data.crimeData)) {
        setCrimeData(data.crimeData);
        console.log(`Loaded ${data.crimeData.length} crime points`);
      } else {
        console.warn("No crime data in API response");
        setCrimeData([]);
      }
    } catch (error) {
      console.error("Error fetching crime data:", error);

      // Fallback to mock data if API fails
      const mockCrimeData = [
        { lat: 34.0522, lng: -118.2437, weight: 8 },
        { lat: 34.0622, lng: -118.2537, weight: 6 },
        { lat: 34.0422, lng: -118.2337, weight: 9 },
        { lat: 34.0722, lng: -118.2637, weight: 4 },
        { lat: 34.0822, lng: -118.2737, weight: 7 },
        { lat: 34.0322, lng: -118.2237, weight: 5 },
      ];
      setCrimeData(mockCrimeData);
      console.log("Using fallback mock data");
    } finally {
      setIsLoadingCrimeData(false);
    }
  };

  // Load crime data when map is ready
  useEffect(() => {
    if (map && !isMapLoading) {
      fetchCrimeData();
    }
  }, [map, isMapLoading]);

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
          map.setView([lat, lng], 13);
        } else if (type === "end") {
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
    if (!map || !crimeData.length) return;

    console.log(
      `Displaying ${crimeData.length} crime points in ${settings.displayMode} mode`
    );

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
      if (settings.displayMode === "heatmap") {
        // Show as heatmap - using colored circles
        const heatmapMarkers = crimeData.map((crime) => {
          const maxWeight = Math.max(...crimeData.map((c) => c.weight));
          const intensity = crime.weight / maxWeight;

          return L.circle([crime.lat, crime.lng], {
            radius: 200 + 300 * intensity,
            fillColor:
              intensity > 0.7
                ? "#ef4444"
                : intensity > 0.4
                ? "#f59e0b"
                : "#eab308",
            color: "transparent",
            weight: 0,
            opacity: 0,
            fillOpacity: 0.3 + intensity * 0.4,
          }).bindPopup(`Crime Weight: ${crime.weight}`);
        });

        const heatmapGroup = L.layerGroup(heatmapMarkers).addTo(map);
        setCrimeHeatmap(heatmapGroup);
        console.log(`Added ${heatmapMarkers.length} heatmap circles`);
      } else if (settings.displayMode === "points") {
        // Show as individual points
        const crimeMarkers = crimeData.map((crime) => {
          const maxWeight = Math.max(...crimeData.map((c) => c.weight));
          const intensity = crime.weight / maxWeight;

          return L.circleMarker([crime.lat, crime.lng], {
            radius: 6 + 8 * intensity,
            fillColor:
              intensity > 0.7
                ? "#ef4444"
                : intensity > 0.4
                ? "#f59e0b"
                : "#eab308",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          }).bindPopup(
            `Crime Weight: ${crime.weight}<br/>Intensity: ${(
              intensity * 100
            ).toFixed(0)}%`
          );
        });

        const crimeGroup = L.layerGroup(crimeMarkers).addTo(map);
        setCrimeHeatmap(crimeGroup);
        console.log(`Added ${crimeMarkers.length} crime point markers`);
      }
    }
  }, [settings.displayMode, map, crimeData]);

  return (
    <div className="leaflet-map-container">
      {/* Loading Overlay */}
      {(isMapLoading || isLoadingCrimeData) && (
        <div className="map-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">
              {isMapLoading ? "Loading map..." : "Loading crime data..."}
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="map-error-overlay">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{mapError}</p>
            <button
              className="retry-button"
              onClick={() => {
                setMapError(null);
                setIsMapLoading(true);
                window.location.reload();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

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
            {isLoadingCrimeData && (
              <span className="loading-indicator">⏳</span>
            )}
          </label>
          <label>
            <input
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
            {crimeData.length > 0 && (
              <span className="data-count">({crimeData.length})</span>
            )}
            {isLoadingCrimeData && (
              <span className="loading-indicator">⏳</span>
            )}
          </label>
        </div>

        {/* Status Info */}
        <div className="status-info">
          {isMapLoading && (
            <span className="status-text">Initializing map...</span>
          )}
          {isLoadingCrimeData && (
            <span className="status-text">Loading crime data...</span>
          )}
          {!isMapLoading && !isLoadingCrimeData && crimeData.length > 0 && (
            <span className="status-text">
              Ready ({crimeData.length} data points)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
