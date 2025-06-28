// web/src/pages/Routing.jsx
import { useState, useEffect, useRef } from "react";
import LeafletMap from "../components/LeafletMap";
import Settings from "../components/Settings";
import Summary from "../components/Summary";
import "./Routing.css";

const Routing = () => {
  // Refs for search inputs
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // State for route information
  const [route, setRoute] = useState(null);

  // State for settings
  const [settings, setSettings] = useState({
    safetyPreference: 70,
    distancePreference: 50,
    timePreference: 50,
    routeType: "direct",
    displayMode: "map", // "map" or "points"
    accountForPace: false, // Toggle for pace calculation
    pace: 15, // Default pace value
  });

  // State for map controls
  const [locations, setLocations] = useState({
    start: "",
    end: "",
  });

  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Handler for settings changes
  const handleSettingsChange = (newSettings) => {
    setSettings({ ...settings, ...newSettings });
  };

  // Handler for location input changes
  const handleLocationChange = (type, value) => {
    if (type === "settings") {
      // Handle settings changes from map
      setSettings(value);
    } else {
      // Handle location changes
      setLocations((prev) => ({
        ...prev,
        [type]: value,
      }));
    }
  };

  // Handler for route generation
  const generateRoute = async () => {
    if (!locations.start || !locations.end) {
      console.log("Need both start and end locations");
      return;
    }

    setIsLoading(true);

    try {
      // Search for start location coordinates
      const startCoords = await searchLocation(locations.start);
      const endCoords = await searchLocation(locations.end);

      if (!startCoords || !endCoords) {
        console.error("Could not find coordinates for one or both locations");
        setIsLoading(false);
        return;
      }

      // This would call your API to generate a route based on settings
      console.log("Generating route with settings:", settings);
      console.log("From:", locations.start, "To:", locations.end);
      console.log("Coordinates:", startCoords, "to", endCoords);

      // Simulate API call to your backend
      try {
        const routeResponse = await fetch("/api/check-route", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: locations.start,
            end: locations.end,
            startCoords,
            endCoords,
            preferences: settings,
          }),
        });

        if (routeResponse.ok) {
          const routeData = await routeResponse.json();
          setRoute({ ...routeData, startCoords, endCoords });
        } else {
          throw new Error("API call failed");
        }
      } catch (apiError) {
        console.log("API not available, using mock data");
        // Mock route data for development
        setRoute({
          distance: 2.3,
          duration: settings.accountForPace
            ? Math.round(2.3 * settings.pace)
            : null,
          safetyScore: 85,
          points: [],
          startCoords,
          endCoords,
        });
      }
    } catch (error) {
      console.error("Error generating route:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to search for location coordinates
  const searchLocation = async (query) => {
    if (!query.trim()) return null;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&countrycodes=us`
      );
      const results = await response.json();

      if (results.length > 0) {
        const result = results[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Auto-generate route when both locations are set
  useEffect(() => {
    if (locations.start && locations.end) {
      generateRoute();
    }
  }, [locations.start, locations.end, settings]);

  return (
    <div className="routing-container">
      <div className="routing-header">
        <div className="location-inputs">
          <div className="input-with-button">
            <input
              ref={startInputRef}
              type="text"
              placeholder="Enter starting location (e.g., Weber State University, Ogden UT)"
              value={locations.start}
              onChange={(e) => handleLocationChange("start", e.target.value)}
            />
            <button
              className="pin-drop-button"
              title="Drop pin on map for start location"
              onClick={() => handlePinDropClick("start")}
            >
              📍
            </button>
          </div>
          <div className="input-with-button">
            <input
              ref={endInputRef}
              type="text"
              placeholder="Enter destination (e.g., Ogden City Mall, Ogden UT)"
              value={locations.end}
              onChange={(e) => handleLocationChange("end", e.target.value)}
            />
            <button
              className="pin-drop-button"
              title="Drop pin on map for destination"
              onClick={() => handlePinDropClick("end")}
            >
              📍
            </button>
          </div>
          <button onClick={generateRoute} disabled={isLoading}>
            {isLoading ? "Loading..." : "Find Safe Route"}
          </button>
        </div>
      </div>

      <div className="routing-main">
        <div className="routing-sidebar">
          <Settings
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        </div>

        <div className="routing-content">
          <div className="routing-map">
            <LeafletMap
              settings={settings}
              locations={locations}
              startInputRef={startInputRef}
              endInputRef={endInputRef}
              onLocationChange={handleLocationChange}
              route={route}
            />
          </div>

          {route && (
            <div className="routing-summary">
              <Summary route={route} settings={settings} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Routing;
