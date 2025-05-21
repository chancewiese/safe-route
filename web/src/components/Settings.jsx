// web/src/components/Settings.jsx
import { useState } from "react";
import "./Settings.css";

const Settings = ({ settings, onSettingsChange }) => {
  // Local state for sliders to avoid too many rerenders
  const [sliderValues, setSliderValues] = useState({
    safetyPreference: settings.safetyPreference,
    distancePreference: settings.distancePreference,
    timePreference: settings.timePreference,
  });

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    priorities: true,
    routeType: true,
    displayMode: true,
    advanced: false,
  });

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };

  // Update local state while dragging
  const handleSliderChange = (e) => {
    const { name, value } = e.target;
    setSliderValues({
      ...sliderValues,
      [name]: parseInt(value, 10),
    });
  };

  // Update parent state when slider is released
  const handleSliderCommit = (e) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: parseInt(value, 10) });
  };

  // Handle radio button changes
  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: value });
  };

  // Handle numeric input changes
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: parseFloat(value) });
  };

  return (
    <div className="settings-panel">
      <h2>Route Preferences</h2>

      <div className="settings-section">
        <div
          className="section-header"
          onClick={() => toggleSection("priorities")}
        >
          <h3>Priority Sliders</h3>
          <span
            className={`chevron ${
              expandedSections.priorities ? "expanded" : ""
            }`}
          >
            ▼
          </span>
        </div>

        {expandedSections.priorities && (
          <div className="section-content">
            <p className="slider-description">
              Adjust these sliders to balance your preferences
            </p>

            <div className="slider-group">
              <label>
                <span>Safety:</span>
                <span className="value-display">
                  {sliderValues.safetyPreference}%
                </span>
              </label>
              <input
                type="range"
                name="safetyPreference"
                min="0"
                max="100"
                value={sliderValues.safetyPreference}
                onChange={handleSliderChange}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
              />
              <div className="slider-labels">
                <span>Less Priority</span>
                <span>High Priority</span>
              </div>
            </div>

            <div className="slider-group">
              <label>
                <span>Distance:</span>
                <span className="value-display">
                  {sliderValues.distancePreference}%
                </span>
              </label>
              <input
                type="range"
                name="distancePreference"
                min="0"
                max="100"
                value={sliderValues.distancePreference}
                onChange={handleSliderChange}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
              />
              <div className="slider-labels">
                <span>Less Priority</span>
                <span>High Priority</span>
              </div>
            </div>

            <div className="slider-group">
              <label>
                <span>Time:</span>
                <span className="value-display">
                  {sliderValues.timePreference}%
                </span>
              </label>
              <input
                type="range"
                name="timePreference"
                min="0"
                max="100"
                value={sliderValues.timePreference}
                onChange={handleSliderChange}
                onMouseUp={handleSliderCommit}
                onTouchEnd={handleSliderCommit}
              />
              <div className="slider-labels">
                <span>Less Priority</span>
                <span>High Priority</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div
          className="section-header"
          onClick={() => toggleSection("routeType")}
        >
          <h3>Route Type</h3>
          <span
            className={`chevron ${
              expandedSections.routeType ? "expanded" : ""
            }`}
          >
            ▼
          </span>
        </div>

        {expandedSections.routeType && (
          <div className="section-content">
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="routeType"
                  value="direct"
                  checked={settings.routeType === "direct"}
                  onChange={handleRadioChange}
                />
                Direct Route
              </label>
              <label>
                <input
                  type="radio"
                  name="routeType"
                  value="loop"
                  checked={settings.routeType === "loop"}
                  onChange={handleRadioChange}
                />
                Loop Route
              </label>
              <label>
                <input
                  type="radio"
                  name="routeType"
                  value="outAndBack"
                  checked={settings.routeType === "outAndBack"}
                  onChange={handleRadioChange}
                />
                Out and Back
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div
          className="section-header"
          onClick={() => toggleSection("displayMode")}
        >
          <h3>Display Mode</h3>
          <span
            className={`chevron ${
              expandedSections.displayMode ? "expanded" : ""
            }`}
          >
            ▼
          </span>
        </div>

        {expandedSections.displayMode && (
          <div className="section-content">
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  value="map"
                  checked={settings.displayMode === "map"}
                  onChange={handleRadioChange}
                />
                Map Only
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  value="heatmap"
                  checked={settings.displayMode === "heatmap"}
                  onChange={handleRadioChange}
                />
                Crime Heatmap
              </label>
              <label>
                <input
                  type="radio"
                  name="displayMode"
                  value="points"
                  checked={settings.displayMode === "points"}
                  onChange={handleRadioChange}
                />
                Crime Points
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div
          className="section-header"
          onClick={() => toggleSection("advanced")}
        >
          <h3>Advanced Settings</h3>
          <span
            className={`chevron ${expandedSections.advanced ? "expanded" : ""}`}
          >
            ▼
          </span>
        </div>

        {expandedSections.advanced && (
          <div className="section-content">
            <div className="input-group">
              <label htmlFor="pace">Your Pace (minutes per mile):</label>
              <input
                type="number"
                id="pace"
                name="pace"
                min="5"
                max="30"
                step="0.1"
                value={settings.pace}
                onChange={handleNumberChange}
                className="number-input"
              />
              <span className="input-hint">
                Walking pace: ~18-20 min/mile, Running pace: ~8-12 min/mile
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
