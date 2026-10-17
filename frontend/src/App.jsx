import HarborMap from "./components/HarborMap.jsx";
import MapInfoPanel from "./components/MapInfoPanel.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Harbor Watch</h1>
        <span className="sub">Port of Los Angeles</span>
      </header>
      <main className="map-wrap">
        <HarborMap />
        <MapInfoPanel />
      </main>
    </div>
  );
}
