// web/src/App.jsx
import "./App.css";
import Routing from "./pages/Routing";
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
        <Routing />
      </main>
      <footer>
        <p>SafeRoute © 2025 | Created for community safety</p>
      </footer>
    </div>
  );
}

export default App;
