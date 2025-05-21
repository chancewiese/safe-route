// web/src/components/Map.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import "./Map.css";

const Map = ({ settings, locations, route }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);

  // Initialize the map
  const initMap = useCallback(() => {
    if (!window.google || !mapRef.current) return;

    // Create a new map centered on a default location (could be user's location)
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 34.0522, lng: -118.2437 }, // Los Angeles, CA as example
      zoom: 13,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Create directions service and renderer for routes
    const newDirectionsService = new window.google.maps.DirectionsService();
    const newDirectionsRenderer = new window.google.maps.DirectionsRenderer({
      map: newMap,
      polylineOptions: {
        strokeColor: "#4F46E5",
        strokeWeight: 6,
        strokeOpacity: 0.8,
      },
    });

    setMap(newMap);
    setDirectionsService(newDirectionsService);
    setDirectionsRenderer(newDirectionsRenderer);

    // If we had crime data, we would create heatmap or markers here
    console.log("Map initialized");
  }, []);

  // Load Google Maps API
  useEffect(() => {
    // Only add script if Google Maps isn't already loaded
    if (!window.google) {
      const googleMapScript = document.createElement("script");
      // You would need to use your own API key
      googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,visualization,geometry`;
      googleMapScript.async = true;
      googleMapScript.defer = true;

      googleMapScript.addEventListener("load", () => {
        console.log("Google Maps loaded successfully");
        initMap();
      });

      document.head.appendChild(googleMapScript);

      return () => {
        document.head.removeChild(googleMapScript);
      };
    } else {
      initMap();
    }
  }, [initMap]);

  // Update display mode when settings change
  useEffect(() => {
    if (!map) return;

    // Clear existing visualizations
    if (heatmap) heatmap.setMap(null);
    markers.forEach((marker) => marker.setMap(null));

    // Update based on display mode
    switch (settings.displayMode) {
      case "heatmap":
        // Would fetch and display heatmap data
        console.log("Displaying heatmap");
        break;
      case "points":
        // Would fetch and display point data
        console.log("Displaying crime points");
        break;
      default:
        // Just show the map
        console.log("Displaying clean map");
    }
  }, [settings.displayMode, map, heatmap, markers]);

  // Update route when route data changes
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer || !route) return;

    // This would use actual route data from the API
    console.log("Displaying route on map");

    // For now, just log that we would display the route
    console.log(
      "Route would be displayed with safety score:",
      route.safetyScore
    );
  }, [route, map, directionsService, directionsRenderer]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map"></div>
      {!window.google && <div className="map-loading">Loading map...</div>}
    </div>
  );
};

export default Map;
