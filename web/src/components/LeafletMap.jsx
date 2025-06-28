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
  onPinDropRequest, // Add this prop to handle pin drop requests
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [startMarker, setStartMarker] = useState(null);
  const [endMarker, setEndMarker] = useState(null);
  const [routeLine, setRouteLine] = useState(null);
  const [crimeHeatmap, setCrimeHeatmap] = useState(null);
  const [crimeData, setCrimeData] = useState([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("ogden_mock_data.csv");
  const [fileInfo, setFileInfo] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [waitingForPin, setWaitingForPin] = useState(null); // 'start', 'end', or null

  // Load available files on component mount
  useEffect(() => {
    const fetchAvailableFiles = async () => {
      try {
        const response = await fetch("/api/crime-files");
        if (response.ok) {
          const result = await response.json();
          setAvailableFiles(result.available_files || []);

          // If ogden_mock_data.csv exists, use it as default
          if (result.available_files?.includes("ogden_mock_data.csv")) {
            setSelectedFile("ogden_mock_data.csv");
          } else if (result.available_files?.length > 0) {
            setSelectedFile(result.available_files[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching available files:", error);
      }
    };

    fetchAvailableFiles();
  }, []);

  // Load crime data from API when selectedFile changes
  useEffect(() => {
    if (!selectedFile) return;

    const fetchCrimeData = async () => {
      setIsLoadingData(true);
      try {
        console.log(`Fetching crime data from API using file: ${selectedFile}`);
        const response = await fetch(
          `/api/crime-data?filename=${encodeURIComponent(selectedFile)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const crimeDataArray = result.crimeData || [];

        console.log(
          `Loaded ${crimeDataArray.length} crime data points from ${selectedFile}`
        );
        setCrimeData(crimeDataArray);

        // Also fetch file info
        fetchFileInfo(selectedFile);
      } catch (error) {
        console.error("Error fetching crime data:", error);

        // Fallback to a few sample points if API fails
        const fallbackData = [
          { lat: 41.223, lng: 111.9738, weight: 245 },
          { lat: 41.2198, lng: 111.9712, weight: 180 },
          { lat: 41.2156, lng: 111.9689, weight: 320 },
        ];

        console.log("Using fallback crime data");
        setCrimeData(fallbackData);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchCrimeData();
  }, [selectedFile]);

  // Fetch file information
  const fetchFileInfo = async (filename) => {
    try {
      const response = await fetch(
        `/api/crime-files/${encodeURIComponent(filename)}/info`
      );
      if (response.ok) {
        const info = await response.json();
        setFileInfo(info);
      }
    } catch (error) {
      console.error("Error fetching file info:", error);
      setFileInfo(null);
    }
  };

  // Function to fit map to crime data
  const fitMapToCrimeData = () => {
    if (!map || !crimeData.length) return;

    const latLngs = crimeData.map((crime) => [crime.lat, crime.lng]);
    const group = new L.featureGroup(latLngs.map((coords) => L.marker(coords)));
    map.fitBounds(group.getBounds().pad(0.1));

    console.log("Fitted map to show all crime data points");
  };

  // Handle pin drop requests from parent component
  const handlePinDropRequest = (type) => {
    console.log(`Pin drop requested for: ${type}`);
    setWaitingForPin(type);
  };

  // Expose pin drop function to parent
  useEffect(() => {
    if (onPinDropRequest) {
      onPinDropRequest(handlePinDropRequest);
    }
  }, [onPinDropRequest]);

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Create map centered on Ogden, Utah with better zoom
    const leafletMap = L.map(mapRef.current).setView([41.223, -111.9738], 13); // Higher zoom level

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(leafletMap);

    // Add click handler for dropping pins (only when waiting for a pin)
    leafletMap.on("click", (e) => {
      if (waitingForPin) {
        handleMapClick(e, leafletMap);
      }
    });

    setMap(leafletMap);

    // Cleanup function
    return () => {
      if (leafletMap) {
        leafletMap.remove();
      }
    };
  }, []);

  // Handle map clicks for pin dropping
  const handleMapClick = async (e, mapInstance) => {
    if (!waitingForPin) return;

    const { lat, lng } = e.latlng;

    try {
      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const result = await response.json();

      const address =
        result.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      // Place the requested marker type
      console.log(`Placing ${waitingForPin} marker at clicked location`);
      createMarker(lat, lng, waitingForPin, address, mapInstance);
      onLocationChange(waitingForPin, address);

      // Update the corresponding input field
      const inputRef = waitingForPin === "start" ? startInputRef : endInputRef;
      if (inputRef?.current) {
        inputRef.current.value = address;
      }

      // Clear waiting state
      setWaitingForPin(null);
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // Fallback to coordinates
      const coords = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      createMarker(lat, lng, waitingForPin, coords, mapInstance);
      onLocationChange(waitingForPin, coords);

      const inputRef = waitingForPin === "start" ? startInputRef : endInputRef;
      if (inputRef?.current) {
        inputRef.current.value = coords;
      }

      setWaitingForPin(null);
    }
  };

  // Create marker helper function
  const createMarker = (lat, lng, type, address, mapInstance) => {
    const iconUrl =
      type === "start"
        ? "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png"
        : "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png";

    // Remove existing marker of this type first
    if (type === "start" && startMarker) {
      mapInstance.removeLayer(startMarker);
      setStartMarker(null);
    } else if (type === "end" && endMarker) {
      mapInstance.removeLayer(endMarker);
      setEndMarker(null);
    }

    const marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
      draggable: true, // Make markers draggable
    }).addTo(mapInstance);

    const popupText = type === "start" ? "Start Location" : "Destination";
    marker.bindPopup(`${popupText}<br/>${address}`);

    // Handle marker dragging
    marker.on("dragend", async (e) => {
      const newPos = e.target.getLatLng();
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}&zoom=18&addressdetails=1`
        );
        const result = await response.json();
        const newAddress =
          result.display_name ||
          `${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`;

        marker.getPopup().setContent(`${popupText}<br/>${newAddress}`);
        onLocationChange(type, newAddress);

        // Update input field
        const inputRef = type === "start" ? startInputRef : endInputRef;
        if (inputRef?.current) {
          inputRef.current.value = newAddress;
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
      }
    });

    // Update state
    if (type === "start") {
      setStartMarker(marker);
    } else {
      setEndMarker(marker);
    }

    console.log(`Created ${type} marker at ${lat}, ${lng}`);
  };

  // Handle location search (geocoding with Nominatim)
  const searchLocation = async (query, type) => {
    if (!query.trim() || !map) return;

    setIsLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + " Utah"
        )}&limit=5&countrycodes=us&bounded=1&viewbox=-112.5,40.5,-111,42`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        // Update location
        onLocationChange(type, result.display_name);

        // Remove existing marker
        if (type === "start" && startMarker) {
          map.removeLayer(startMarker);
          setStartMarker(null);
        } else if (type === "end" && endMarker) {
          map.removeLayer(endMarker);
          setEndMarker(null);
        }

        // Create new marker
        createMarker(lat, lng, type, result.display_name, map);

        // Center map on location if it's the first marker
        if (
          (!startMarker && !endMarker) ||
          (type === "start" && !endMarker) ||
          (type === "end" && !startMarker)
        ) {
          map.setView([lat, lng], 13);
        }
      } else {
        console.log("No results found for:", query);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle input changes with debouncing
  useEffect(() => {
    if (!startInputRef?.current || !endInputRef?.current) return;

    let startTimeout, endTimeout;

    const handleStartInput = (e) => {
      clearTimeout(startTimeout);
      startTimeout = setTimeout(() => {
        searchLocation(e.target.value, "start");
      }, 1000); // Wait 1 second after user stops typing
    };

    const handleEndInput = (e) => {
      clearTimeout(endTimeout);
      endTimeout = setTimeout(() => {
        searchLocation(e.target.value, "end");
      }, 1000);
    };

    const handleStartKeyDown = (e) => {
      if (e.key === "Enter") {
        clearTimeout(startTimeout);
        searchLocation(e.target.value, "start");
      }
    };

    const handleEndKeyDown = (e) => {
      if (e.key === "Enter") {
        clearTimeout(endTimeout);
        searchLocation(e.target.value, "end");
      }
    };

    startInputRef.current.addEventListener("input", handleStartInput);
    endInputRef.current.addEventListener("input", handleEndInput);
    startInputRef.current.addEventListener("keydown", handleStartKeyDown);
    endInputRef.current.addEventListener("keydown", handleEndKeyDown);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(endTimeout);
      if (startInputRef.current) {
        startInputRef.current.removeEventListener("input", handleStartInput);
        startInputRef.current.removeEventListener(
          "keydown",
          handleStartKeyDown
        );
      }
      if (endInputRef.current) {
        endInputRef.current.removeEventListener("input", handleEndInput);
        endInputRef.current.removeEventListener("keydown", handleEndKeyDown);
      }
    };
  }, [map]);

  // Handle route display when route data changes
  useEffect(() => {
    if (!map || !route || !route.startCoords || !route.endCoords) return;

    // Remove existing route line
    if (routeLine) {
      map.removeLayer(routeLine);
    }

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

    line.bindPopup(
      `Safety Score: ${route.safetyScore}/100<br/>Distance: ${route.distance} miles`
    );
    setRouteLine(line);

    // Fit map to show entire route if both markers exist
    if (startMarker && endMarker) {
      const group = L.featureGroup([startMarker, endMarker, line]);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    console.log("Route displayed on map");
  }, [route, map, startMarker, endMarker]);

  // Display crime data based on settings
  useEffect(() => {
    console.log("Crime display effect triggered:", {
      hasMap: !!map,
      crimeDataLength: crimeData.length,
      displayMode: settings.displayMode,
      hasExistingHeatmap: !!crimeHeatmap,
      selectedFile: selectedFile,
    });

    if (!map || !crimeData.length) {
      console.log("Early return - no map or no crime data");
      return;
    }

    // Debug: Show sample of crime data
    console.log("Sample crime data points:", crimeData.slice(0, 3));

    // Debug: Check map bounds
    if (map) {
      const bounds = map.getBounds();
      console.log("Current map bounds:", {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });

      // Check if crime data is within bounds
      const pointsInView = crimeData.filter(
        (crime) =>
          crime.lat >= bounds.getSouth() &&
          crime.lat <= bounds.getNorth() &&
          crime.lng >= bounds.getWest() &&
          crime.lng <= bounds.getEast()
      );
      console.log(
        `${pointsInView.length} crime points are within current map view`
      );
    }

    // Remove existing crime visualization
    if (crimeHeatmap) {
      console.log("Removing existing crime visualization");
      map.removeLayer(crimeHeatmap);
      setCrimeHeatmap(null);
    }

    // Add crime data visualization based on display mode
    if (settings.displayMode === "heatmap") {
      console.log("Creating heatmap visualization");
      // Show as heatmap - simulate with colored circles
      const heatmapMarkers = crimeData.map((crime) => {
        const intensity = Math.min(crime.weight / 500, 1); // Normalize to 0-1
        return L.circle([crime.lat, crime.lng], {
          radius: 100 + intensity * 200, // 100-300 meter radius
          fillColor:
            intensity > 0.7
              ? "#ef4444"
              : intensity > 0.4
              ? "#f59e0b"
              : "#eab308",
          color: "transparent",
          weight: 0,
          opacity: 0,
          fillOpacity: 0.2 + intensity * 0.4,
        });
      });

      const heatmapGroup = L.layerGroup(heatmapMarkers).addTo(map);
      setCrimeHeatmap(heatmapGroup);
      console.log(`Displayed ${heatmapMarkers.length} heatmap circles`);
    } else if (settings.displayMode === "points") {
      console.log("Creating crime points visualization");
      // Show as individual points
      const crimeMarkers = crimeData.map((crime, index) => {
        const intensity = Math.min(crime.weight / 500, 1);
        console.log(`Creating marker ${index + 1}:`, crime);
        return L.circleMarker([crime.lat, crime.lng], {
          radius: 8 + intensity * 8, // 8-16 pixel radius (made even larger)
          fillColor:
            intensity > 0.7
              ? "#ef4444"
              : intensity > 0.4
              ? "#f59e0b"
              : "#eab308",
          color: "#000",
          weight: 3, // Made border even thicker
          opacity: 1,
          fillOpacity: 0.9,
        }).bindPopup(
          `Crime Weight: ${crime.weight}<br/>Intensity: ${(
            intensity * 100
          ).toFixed(0)}%<br/>Lat: ${crime.lat}<br/>Lng: ${crime.lng}`
        );
      });

      const crimeGroup = L.layerGroup(crimeMarkers).addTo(map);
      setCrimeHeatmap(crimeGroup);
      console.log(
        `Created and displayed ${crimeMarkers.length} crime point markers`
      );

      // Force map to show crime data area if no markers visible
      if (crimeMarkers.length > 0) {
        const group = L.featureGroup(crimeMarkers);
        console.log("Crime data bounds:", group.getBounds());
      }
    } else {
      console.log("Display mode is 'map' - no crime visualization");
    }
  }, [settings.displayMode, map, crimeData, selectedFile]);

  // Clear markers function
  const clearMarkers = () => {
    if (startMarker) {
      map.removeLayer(startMarker);
      setStartMarker(null);
    }
    if (endMarker) {
      map.removeLayer(endMarker);
      setEndMarker(null);
    }
    if (routeLine) {
      map.removeLayer(routeLine);
      setRouteLine(null);
    }
    // Clear input fields
    if (startInputRef?.current) startInputRef.current.value = "";
    if (endInputRef?.current) endInputRef.current.value = "";
    onLocationChange("start", "");
    onLocationChange("end", "");
  };

  return (
    <div className="leaflet-map-container">
      {/* Map Container */}
      <div ref={mapRef} className="leaflet-map" />

      {/* Loading indicator */}
      {(isLoadingLocation || isLoadingData) && (
        <div className="map-loading">
          {isLoadingLocation
            ? "Searching location..."
            : "Loading crime data..."}
        </div>
      )}

      {/* Map Controls */}
      <div className="map-controls">
        <div className="control-group">
          <h4 className="control-title">Pin Drop Status</h4>
          {waitingForPin ? (
            <div
              style={{
                fontSize: "0.9rem",
                color: "#ef4444",
                fontWeight: "bold",
                padding: "8px",
                backgroundColor: "#fef2f2",
                borderRadius: "4px",
                border: "1px solid #fecaca",
              }}
            >
              Click on map to place {waitingForPin} marker
            </div>
          ) : (
            <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
              Use pin buttons above to drop markers
            </div>
          )}
        </div>

        <div className="control-group">
          <h4 className="control-title">Crime Data File</h4>
          {availableFiles.length > 0 ? (
            <select
              value={selectedFile}
              onChange={(e) => handleFileChange(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "white",
                fontSize: "0.9rem",
                marginBottom: "8px",
                width: "100%",
              }}
            >
              {availableFiles.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              No files available
            </div>
          )}

          {fileInfo && (
            <div
              style={{ fontSize: "0.8rem", color: "#666", marginTop: "4px" }}
            >
              {fileInfo.record_count} points
              <br />
              Weights: {fileInfo.weight_stats?.min}-{fileInfo.weight_stats?.max}
              <br />
              <button
                onClick={fitMapToCrimeData}
                style={{
                  fontSize: "0.8rem",
                  padding: "4px 8px",
                  marginTop: "4px",
                  backgroundColor: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                Show All Data
              </button>
            </div>
          )}
        </div>

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
          </label>
          <label>
            <input
              type="radio"
              name="displayMode"
              value="points"
              checked={settings.displayMode === "points"}
              onChange={(e) => {
                console.log("Switching to crime points mode");
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
