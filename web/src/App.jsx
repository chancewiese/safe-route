import "./App.css";
import SafeRouteMap from "./components/SafeRouteMap";
import safeRouteLogo from "./assets/safe-route-logo.png";

function App() {
  return (
    <div className="App">
      <header>
        <div className="logo-title-container">
          <img src={safeRouteLogo} alt="SafeRoute Logo" className="logo" />
        </div>
        <p className="tagline">Navigate your city with confidence</p>
      </header>
      <main>
        <SafeRouteMap />
        <div className="info-section">
          <h2>How It Works</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Data-Driven Safety</h3>
              <p>
                Our system analyzes crime data to identify safer routes for
                pedestrians.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🧭</div>
              <h3>Multiple Routes</h3>
              <p>
                Compare alternative paths to find the right balance of safety
                and convenience.
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer>
        <p>SafeRoute © 2025 | Created for community safety</p>
      </footer>
    </div>
  );
}

export default App;
