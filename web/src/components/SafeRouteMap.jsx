// web/src/components/SafeRouteMap.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./SafeRouteMap.css";

const SafeRouteMap = () => {
  const mapRef = useRef(null);
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [crimeData, setCrimeData] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);

  // Initialize the map
  const initMap = useCallback(() => {
    if (!window.google || !mapRef.current) return;

    // Create a new map centered on Los Angeles
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 34.0522, lng: -118.2437 }, // Los Angeles, CA
      zoom: 12,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
    });

    // Create directions service and renderer
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

    // Fetch crime data
    fetchCrimeData(newMap);
  }, []);

  // Fetch crime data from the API
  const fetchCrimeData = async (mapInstance) => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/crime-data");
      const data = response.data.crimeData || [];
      setCrimeData(data);
      console.log(`Fetched ${data.length} crime data points`);

      // Create heatmap with the data
      if (data.length > 0 && mapInstance && window.google) {
        createHeatmap(data, mapInstance);
      }
    } catch (error) {
      console.error("Error fetching crime data:", error);
      setMessage("Error loading crime data. Please try again later.");
      setMessageType("danger");
    } finally {
      setIsLoading(false);
    }
  };

  // Create heatmap from crime data
  const createHeatmap = (data, mapInstance) => {
    if (!window.google || !mapInstance) return;

    // Convert the data for the heatmap
    const heatmapData = data.map((crime) => ({
      location: new window.google.maps.LatLng(crime.lat, crime.lng),
      weight: crime.weight,
    }));

    // Create heatmap layer with improved settings for visibility
    const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData.map((crime) => crime.location),
      map: null, // Initialize with null to make it hidden by default
      radius: 15,
      opacity: 0.8,
      dissipating: true,
      maxIntensity: 20,
      gradient: [
        "rgba(0, 255, 255, 0)",
        "rgba(0, 255, 255, 1)",
        "rgba(0, 191, 255, 1)",
        "rgba(0, 127, 255, 1)",
        "rgba(0, 63, 255, 1)",
        "rgba(0, 0, 255, 1)",
        "rgba(0, 0, 223, 1)",
        "rgba(0, 0, 191, 1)",
        "rgba(0, 0, 159, 1)",
        "rgba(0, 0, 127, 1)",
        "rgba(63, 0, 91, 1)",
        "rgba(127, 0, 63, 1)",
        "rgba(191, 0, 31, 1)",
        "rgba(255, 0, 0, 1)",
      ],
    });

    setHeatmap(newHeatmap);
    setIsHeatmapVisible(false); // Ensure this state matches the heatmap visibility
    console.log(
      `Created heatmap with ${data.length} points (hidden by default)`
    );
  };

  // Check route safety with the API
  const checkRouteSafety = async (routePoints) => {
    try {
      console.log(
        `Checking safety for route with ${routePoints.length} points`
      );
      const response = await axios.post("/api/check-route", {
        route: routePoints,
      });

      return response.data;
    } catch (error) {
      console.error("Error checking route safety:", error);
      // If API fails, fallback to a default score
      return {
        safetyScore: 75,
        safetyCategory: "warning",
        affectingCrimeCount: 0,
      };
    }
  };

  // Calculate a safe route
  const calculateSafeRoute = () => {
    if (!startLocation || !endLocation) {
      setMessage("Please enter both starting location and destination.");
      setMessageType("warning");
      return;
    }

    setMessage("Calculating routes and analyzing safety...");
    setMessageType("");
    setIsLoading(true);

    // Clear previous alternatives
    setRouteAlternatives([]);
    setSelectedRouteIndex(0);

    directionsService.route(
      {
        origin: startLocation,
        destination: endLocation,
        travelMode: window.google.maps.TravelMode.WALKING,
        avoidHighways: true,
        provideRouteAlternatives: true, // Request multiple routes
      },
      async (response, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          // Process all routes and check their safety
          const routesWithSafety = await Promise.all(
            response.routes.map(async (route, index) => {
              // Extract route points
              const routePoints = route.overview_path.map((point) => ({
                lat: point.lat(),
                lng: point.lng(),
              }));

              // Check safety using API
              const safetyInfo = await checkRouteSafety(routePoints);

              return {
                index,
                route,
                routePoints,
                safetyScore: safetyInfo.safetyScore,
                safetyCategory: safetyInfo.safetyCategory,
                affectingCrimeCount: safetyInfo.affectingCrimeCount,
                distance: route.legs[0].distance.text,
                duration: route.legs[0].duration.text,
              };
            })
          );

          // Sort routes by safety score (highest first)
          const sortedRoutes = [...routesWithSafety].sort(
            (a, b) => b.safetyScore - a.safetyScore
          );

          // Limit to at most 3 routes
          const topRoutes = sortedRoutes.slice(0, 3);
          setRouteAlternatives(topRoutes);

          // Display the safest route
          if (topRoutes.length > 0) {
            const safestRoute = topRoutes[0];
            directionsRenderer.setDirections(response);
            directionsRenderer.setRouteIndex(safestRoute.index);

            // Set appropriate message based on safety score
            if (safestRoute.safetyCategory === "safe") {
              setMessage(
                `✅ This route appears to be safe (Safety Score: ${safestRoute.safetyScore.toFixed(
                  0
                )}/100). Distance: ${safestRoute.distance}, Duration: ${
                  safestRoute.duration
                }`
              );
              setMessageType("safe");
            } else if (safestRoute.safetyCategory === "warning") {
              setMessage(
                `⚠️ This route has moderate safety concerns (Safety Score: ${safestRoute.safetyScore.toFixed(
                  0
                )}/100). Stay alert. Distance: ${
                  safestRoute.distance
                }, Duration: ${safestRoute.duration}`
              );
              setMessageType("warning");
            } else {
              setMessage(
                `🚨 This route has significant safety concerns (Safety Score: ${safestRoute.safetyScore.toFixed(
                  0
                )}/100). Consider traveling during daylight hours or with companions. Distance: ${
                  safestRoute.distance
                }, Duration: ${safestRoute.duration}`
              );
              setMessageType("danger");
            }
          }
        } else {
          setMessage(`Could not find a route: ${status}`);
          setMessageType("danger");
        }
        setIsLoading(false);
      }
    );
  };

  // Set up autocomplete
  useEffect(() => {
    if (window.google && map && startInputRef.current && endInputRef.current) {
      // Initialize Places Autocomplete for both input fields
      const startAutocomplete = new window.google.maps.places.Autocomplete(
        startInputRef.current
      );
      const endAutocomplete = new window.google.maps.places.Autocomplete(
        endInputRef.current
      );

      // Bind the autocomplete to the map's bounds for better suggestions
      startAutocomplete.bindTo("bounds", map);
      endAutocomplete.bindTo("bounds", map);

      // Handle place selection for start location
      startAutocomplete.addListener("place_changed", () => {
        const place = startAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          setStartLocation(place.formatted_address || place.name);

          // Move the map to show this location
          map.setCenter(place.geometry.location);
          map.setZoom(13);

          // Add a marker for the start location
          new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: "Start Location",
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
            },
          });
        }
      });

      // Handle place selection for end location
      endAutocomplete.addListener("place_changed", () => {
        const place = endAutocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          setEndLocation(place.formatted_address || place.name);

          // Add a marker for the end location
          new window.google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: "Destination",
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });
        }
      });
    }
  }, [map]);

  // Load Google Maps API
  useEffect(() => {
    // Only add script if Google Maps isn't already loaded
    if (!window.google) {
      const googleMapScript = document.createElement("script");
      googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAtat5YJ5UZs2SJ1qI48tttmWX5AzrHvRw&libraries=places,visualization,geometry`;
      googleMapScript.async = true;
      googleMapScript.defer = true;

      // Use event listener instead of callback
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

  // Change selected route
  const selectRoute = (index) => {
    if (routeAlternatives.length > 0 && index < routeAlternatives.length) {
      const selectedRoute = routeAlternatives[index];
      directionsRenderer.setRouteIndex(selectedRoute.index);
      setSelectedRouteIndex(index);

      // Update message based on safety score
      if (selectedRoute.safetyCategory === "safe") {
        setMessage(
          `✅ This route appears to be safe (Safety Score: ${selectedRoute.safetyScore.toFixed(
            0
          )}/100). Distance: ${selectedRoute.distance}, Duration: ${
            selectedRoute.duration
          }`
        );
        setMessageType("safe");
      } else if (selectedRoute.safetyCategory === "warning") {
        setMessage(
          `⚠️ This route has moderate safety concerns (Safety Score: ${selectedRoute.safetyScore.toFixed(
            0
          )}/100). Stay alert. Distance: ${selectedRoute.distance}, Duration: ${
            selectedRoute.duration
          }`
        );
        setMessageType("warning");
      } else {
        setMessage(
          `🚨 This route has significant safety concerns (Safety Score: ${selectedRoute.safetyScore.toFixed(
            0
          )}/100). Consider traveling during daylight hours or with companions. Distance: ${
            selectedRoute.distance
          }, Duration: ${selectedRoute.duration}`
        );
        setMessageType("danger");
      }
    }
  };

  // Toggle the heatmap visibility
  const toggleHeatmap = () => {
    if (heatmap) {
      if (isHeatmapVisible) {
        heatmap.setMap(null);
      } else {
        heatmap.setMap(map);
      }
      setIsHeatmapVisible(!isHeatmapVisible);
    }
  };

  return (
    <div className="safe-route-map-container">
      <div className="controls">
        <div className="input-group">
          <input
            ref={startInputRef}
            type="text"
            placeholder="Enter starting location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
          />
          <input
            ref={endInputRef}
            type="text"
            placeholder="Enter destination"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
          />
          <button onClick={calculateSafeRoute} disabled={isLoading}>
            {isLoading ? "Loading..." : "Find Safe Route"}
          </button>
        </div>

        <div className="map-controls">
          <button
            className={`toggle-button ${isHeatmapVisible ? "active" : ""}`}
            onClick={toggleHeatmap}
          >
            {isHeatmapVisible ? "Hide" : "Show"} Crime Heatmap
          </button>
          <div className="data-info">
            Data based on {crimeData.length} crime locations
          </div>
        </div>

        {message && <div className={`message ${messageType}`}>{message}</div>}

        {/* Route alternatives */}
        {routeAlternatives.length > 1 && (
          <div className="route-alternatives">
            <h3>Safest Routes</h3>
            <div className="alternatives-container">
              {routeAlternatives.map((route, index) => (
                <div
                  key={index}
                  className={`route-option ${
                    selectedRouteIndex === index ? "selected" : ""
                  } ${route.safetyCategory}`}
                  onClick={() => selectRoute(index)}
                >
                  <div className="route-info">
                    <span className="route-name">Route {index + 1}</span>
                    <span className="safety-score">
                      Safety: {route.safetyScore.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="route-details">
                    <span>{route.distance}</span>
                    <span>{route.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div ref={mapRef} className="map"></div>
    </div>
  );
};

export default SafeRouteMap;
