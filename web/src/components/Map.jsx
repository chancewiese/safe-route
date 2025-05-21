// web/src/components/Map.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import "./Map.css";

const Map = ({
  settings,
  locations,
  startInputRef,
  endInputRef,
  onLocationChange,
  route,
  apiKey,
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [mapError, setMapError] = useState(null);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  // Initialize the map
  const initMap = useCallback(() => {
    if (!window.google || !window.google.maps || !mapRef.current) {
      setMapError(
        "Google Maps failed to load correctly. Please check your API key."
      );
      return;
    }

    try {
      // Create a new map centered on the US
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 }, // Geographic center of the contiguous United States
        zoom: 4, // Zoom level to show the entire US
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

      console.log("Map initialized with US view");

      // Set up autocomplete for location inputs
      setupPlacesAutocomplete(newMap);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(
        "Failed to initialize map. Please make sure you have a valid Google Maps API key."
      );
    }
  }, [startInputRef, endInputRef, onLocationChange]);

  // Set up autocomplete for location inputs
  const setupPlacesAutocomplete = (mapInstance) => {
    if (
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places ||
      !startInputRef ||
      !startInputRef.current ||
      !endInputRef ||
      !endInputRef.current
    ) {
      console.error("Cannot set up Places Autocomplete - missing dependencies");
      return;
    }

    try {
      // Initialize Places Autocomplete for both input fields
      const startAutocomplete = new window.google.maps.places.Autocomplete(
        startInputRef.current
      );
      const endAutocomplete = new window.google.maps.places.Autocomplete(
        endInputRef.current
      );

      // Bind the autocomplete to the map's bounds for better suggestions
      startAutocomplete.bindTo("bounds", mapInstance);
      endAutocomplete.bindTo("bounds", mapInstance);

      // Handle place selection for start location
      startAutocomplete.addListener("place_changed", () => {
        const place = startAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          onLocationChange("start", place.formatted_address || place.name);

          // Move the map to show this location
          mapInstance.setCenter(place.geometry.location);
          mapInstance.setZoom(13);

          // Clear existing markers first
          markers.forEach((marker) => marker.setMap(null));
          const updatedMarkers = [...markers];

          // Add a marker for the start location
          const startMarker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: mapInstance,
            title: "Start Location",
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
            },
          });

          updatedMarkers.push(startMarker);
          setMarkers(updatedMarkers);
        }
      });

      // Handle place selection for end location
      endAutocomplete.addListener("place_changed", () => {
        const place = endAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          onLocationChange("end", place.formatted_address || place.name);

          // Add a marker for the end location
          const endMarker = new window.google.maps.Marker({
            position: place.geometry.location,
            map: mapInstance,
            title: "Destination",
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });

          setMarkers([...markers, endMarker]);
        }
      });

      console.log("Places Autocomplete initialized successfully");
    } catch (error) {
      console.error("Error setting up Places Autocomplete:", error);
    }
  };

  // Load Google Maps API
  useEffect(() => {
    // To prevent multiple script loads and API errors
    if (window.googleMapsScriptAttempted) return;
    window.googleMapsScriptAttempted = true;

    // Function to detect errors in Google Maps loading
    const handleScriptError = () => {
      console.error("Google Maps script failed to load");
      setMapError("Google Maps API failed to load. Please check your API key.");
      setGoogleScriptLoaded(false);
    };

    try {
      // Only add script if Google Maps isn't already loaded
      if (!window.google) {
        const googleMapScript = document.createElement("script");
        // Use the provided API key
        googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization,geometry`;
        googleMapScript.async = true;
        googleMapScript.defer = true;

        googleMapScript.addEventListener("load", () => {
          console.log("Google Maps loaded successfully");
          setGoogleScriptLoaded(true);
          initMap();
        });

        googleMapScript.addEventListener("error", handleScriptError);

        document.head.appendChild(googleMapScript);

        return () => {
          // Clean up
          document.head.removeChild(googleMapScript);
        };
      } else {
        setGoogleScriptLoaded(true);
        initMap();
      }
    } catch (error) {
      console.error("Error loading Google Maps:", error);
      setMapError(
        "Error loading Google Maps. Please refresh the page and try again."
      );
    }
  }, [initMap, apiKey]);

  // Update display mode when settings change
  useEffect(() => {
    if (!map) return;

    // Clear existing visualizations
    if (heatmap) heatmap.setMap(null);

    // Update based on display mode
    switch (settings.displayMode) {
      case "heatmap":
        // Would fetch and display heatmap data
        console.log("Displaying heatmap");
        if (heatmap) heatmap.setMap(map);
        break;
      case "points":
        // Would fetch and display point data
        console.log("Displaying crime points");
        break;
      default:
        // Just show the map
        console.log("Displaying clean map");
    }
  }, [settings.displayMode, map, heatmap]);

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

    // Here we would use directionsService to get directions based on locations
    // and then set them on the directionsRenderer
    if (locations.start && locations.end) {
      directionsService.route(
        {
          origin: locations.start,
          destination: locations.end,
          travelMode: window.google.maps.TravelMode.WALKING,
          avoidHighways: true,
          provideRouteAlternatives: true,
        },
        (response, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(response);
            // You could also analyze the safety of each route here
          } else {
            console.error("Directions request failed due to", status);
          }
        }
      );
    }
  }, [route, map, directionsService, directionsRenderer, locations]);

  return (
    <div className="map-container">
      <div ref={mapRef} className="map">
        {mapError && (
          <div className="map-error">
            <p>{mapError}</p>
            <p className="map-error-note">
              To make the map work, you need to add a valid Google Maps API key
              to the Map.jsx file.
            </p>
          </div>
        )}
      </div>
      {!googleScriptLoaded && !mapError && (
        <div className="map-loading">Loading map...</div>
      )}
    </div>
  );
};

export default Map;
