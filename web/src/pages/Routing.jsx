// web/src/pages/Routing.jsx
import { useState, useEffect, useRef } from "react";
import Map from "../components/Map";
import Settings from "../components/Settings";
import Summary from "../components/Summary";
import "./Routing.css";

const Routing = () => {
  // Refs for autocomplete inputs
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);

  // State for route information
  const [route, setRoute] = useState(null);

  // State for settings
  const [settings, setSettings] = useState({
    safetyPreference: 70, // 0-100 slider value
    distancePreference: 50, // 0-100 slider value
    timePreference: 50, // 0-100 slider value
    routeType: "direct", // "direct", "loop", or "outAndBack"
    displayMode: "map", // "map", "heatmap", or "points"
    pace: 15, // minutes per mile (walking pace by default)
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
    setLocations((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  // Handler for route generation
  const generateRoute = () => {
    if (!locations.start || !locations.end) {
      // Could add a validation message here
      return;
    }

    setIsLoading(true);

    // This would call the API to generate a route based on settings
    console.log("Generating route with settings:", settings);
    console.log("From:", locations.start, "To:", locations.end);

    // Mock route data for now
    setTimeout(() => {
      setRoute({
        distance: 2.3, // miles
        duration: 35, // minutes at current pace
        safetyScore: 85, // 0-100
        points: [], // Would contain lat/lng points
      });
      setIsLoading(false);
    }, 1000); // Simulate API delay
  };

  return (
    <div className="routing-container">
      <div className="routing-header">
        <div className="location-inputs">
          <input
            ref={startInputRef}
            type="text"
            placeholder="Enter starting location"
            value={locations.start}
            onChange={(e) => handleLocationChange("start", e.target.value)}
          />
          <input
            ref={endInputRef}
            type="text"
            placeholder="Enter destination"
            value={locations.end}
            onChange={(e) => handleLocationChange("end", e.target.value)}
          />
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
            <Map
              settings={settings}
              locations={locations}
              startInputRef={startInputRef}
              endInputRef={endInputRef}
              onLocationChange={handleLocationChange}
              route={route}
              apiKey="AIzaSyAtat5YJ5UZs2SJ1qI48tttmWX5AzrHvRw"
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
