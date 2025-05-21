// web/src/pages/Routing.jsx
import { useState } from "react";
import Map from "../components/Map";
import Settings from "../components/Settings";
import Summary from "../components/Summary";
import "./Routing.css";

const Routing = () => {
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

  // Handler for settings changes
  const handleSettingsChange = (newSettings) => {
    setSettings({ ...settings, ...newSettings });
  };

  // Handler for route generation
  const generateRoute = () => {
    // This would call the API to generate a route based on settings
    console.log("Generating route with settings:", settings);
    console.log("From:", locations.start, "To:", locations.end);

    // Mock route data for now
    setRoute({
      distance: 2.3, // miles
      duration: 35, // minutes at current pace
      safetyScore: 85, // 0-100
      points: [], // Would contain lat/lng points
    });
  };

  return (
    <div className="routing-container">
      <div className="routing-header">
        <div className="location-inputs">
          <input
            type="text"
            placeholder="Enter starting location"
            value={locations.start}
            onChange={(e) =>
              setLocations({ ...locations, start: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Enter destination"
            value={locations.end}
            onChange={(e) =>
              setLocations({ ...locations, end: e.target.value })
            }
          />
          <button onClick={generateRoute}>Find Safe Route</button>
        </div>
      </div>

      <div className="routing-main">
        <div className="routing-sidebar">
          <Settings
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
          <Summary route={route} settings={settings} />
        </div>
        <div className="routing-map">
          <Map settings={settings} locations={locations} route={route} />
        </div>
      </div>
    </div>
  );
};

export default Routing;
