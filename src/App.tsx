import { useState, useRef } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { MapView, MapViewRef } from '@/components/map/map-view';
import { WaterPointsDrawer } from '@/components/water-points-drawer';
import { SettingsPanel } from '@/components/settings-panel';
import { CircularControls } from '@/components/map/circular-controls';
import { GPXData, WaterPoint, LocationPoint, CurrentPosition, LocationFilters } from '@/types';

function App() {
  const [gpxData, setGpxData] = useState<GPXData | null>(null);
  const [waterPoints, setWaterPoints] = useState<WaterPoint[]>([]);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [selectedWaterPoint, setSelectedWaterPoint] = useState<WaterPoint | null>(null);
  const [selectedLocationPoint, setSelectedLocationPoint] = useState<LocationPoint | null>(null);
  const [bufferDistance, setBufferDistance] = useState<number>(15);
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({
    drinkingWater: false,
    restaurants: false,
    supermarkets: false,
    gasStations: false,
    hospitals: false,
    graveyards: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mapRef = useRef<MapViewRef>(null);

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Full-screen map */}
      <MapView 
        ref={mapRef}
        gpxData={gpxData} 
        waterPoints={waterPoints}
        locationPoints={locationPoints}
        currentPosition={currentPosition}
        selectedWaterPoint={selectedWaterPoint}
        selectedLocationPoint={selectedLocationPoint}
        onWaterPointSelect={setSelectedWaterPoint}
        onLocationPointSelect={setSelectedLocationPoint}
        className="absolute inset-0"
      />

      {/* Floating circular controls */}
      <CircularControls
        onGpxLoad={setGpxData}
        onWaterPointsLoad={setWaterPoints}
        onCurrentPositionChange={setCurrentPosition}
        onLoadingChange={setIsLoading}
        onSettingsToggle={() => setIsSettingsOpen(true)}
        bufferDistance={bufferDistance}
        waterFilterPreset="potable-only"
        isLoading={isLoading}
        gpxData={gpxData}
      />

      {/* Water points drawer */}
      <WaterPointsDrawer
        waterPoints={waterPoints}
        gpxData={gpxData}
        currentPosition={currentPosition}
        selectedWaterPoint={selectedWaterPoint}
        onWaterPointSelect={setSelectedWaterPoint}
      />

      {/* Settings panel overlay */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        bufferDistance={bufferDistance}
        onBufferDistanceChange={setBufferDistance}
        locationFilters={locationFilters}
        onLocationFiltersChange={setLocationFilters}
        gpxData={gpxData}
        locationPoints={locationPoints}
        onLocationPointsLoad={setLocationPoints}
        onLoadingChange={setIsLoading}
        isLoading={isLoading}
      />
      
      {/* Toast notifications */}
      <Toaster 
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
          },
        }}
      />
    </div>
  );
}

export default App;
