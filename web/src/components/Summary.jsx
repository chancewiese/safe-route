// web/src/components/Summary.jsx
import "./Summary.css";

const Summary = ({ route, settings }) => {
  // Helper function to get safety rating text
  const getSafetyRating = (score) => {
    if (score >= 80) return { text: "Very Safe", className: "safety-high" };
    if (score >= 60) return { text: "Safe", className: "safety-medium" };
    if (score >= 40)
      return { text: "Moderate Risk", className: "safety-moderate" };
    if (score >= 20) return { text: "Risky", className: "safety-low" };
    return { text: "High Risk", className: "safety-very-low" };
  };

  // If no route is selected yet
  if (!route) {
    return (
      <div className="summary-panel">
        <h2>Route Summary</h2>
        <div className="no-route-message">
          <p>Enter a start and destination to generate a route</p>
        </div>
      </div>
    );
  }

  const safetyRating = getSafetyRating(route.safetyScore);

  return (
    <div className="summary-panel">
      <h2>Route Summary</h2>

      <div className="summary-content">
        <div className="summary-metrics">
          <div className="metric">
            <div className="metric-label">Distance</div>
            <div className="metric-value">{route.distance} miles</div>
          </div>

          <div className="metric">
            <div className="metric-label">Est. Time</div>
            <div className="metric-value">{route.duration} mins</div>
            <div className="metric-details">
              at {settings.pace} min/mile pace
            </div>
          </div>

          <div className="metric">
            <div className="metric-label">Safety Score</div>
            <div className={`metric-value ${safetyRating.className}`}>
              {route.safetyScore}/100
            </div>
            <div className={`safety-rating ${safetyRating.className}`}>
              {safetyRating.text}
            </div>
          </div>
        </div>

        <div className="route-recommendations">
          <h3>Safety Tips</h3>
          <ul className="safety-tips">
            {route.safetyScore < 60 && (
              <>
                <li>Consider traveling during daylight hours</li>
                <li>Stay on main streets and well-lit areas</li>
                <li>Travel with a companion if possible</li>
              </>
            )}
            {route.safetyScore >= 60 && (
              <>
                <li>This route passes through generally safe areas</li>
                <li>Always stay aware of your surroundings</li>
              </>
            )}
            <li>Share your route with a friend before departing</li>
          </ul>
        </div>

        <div className="alternative-routes">
          <h3>Alternative Routes</h3>
          <p className="alternatives-info">3 potential routes calculated</p>

          <div className="route-options">
            <div className="route-option selected">
              <div className="route-option-details">
                <span className="route-name">Safest Route</span>
                <span className="route-safety-score safety-high">85/100</span>
              </div>
              <div className="route-option-metrics">
                <span>{route.distance} miles</span>
                <span>{route.duration} mins</span>
              </div>
            </div>

            <div className="route-option">
              <div className="route-option-details">
                <span className="route-name">Fastest Route</span>
                <span className="route-safety-score safety-medium">65/100</span>
              </div>
              <div className="route-option-metrics">
                <span>2.1 miles</span>
                <span>30 mins</span>
              </div>
            </div>

            <div className="route-option">
              <div className="route-option-details">
                <span className="route-name">Shortest Route</span>
                <span className="route-safety-score safety-low">45/100</span>
              </div>
              <div className="route-option-metrics">
                <span>1.9 miles</span>
                <span>32 mins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary;
