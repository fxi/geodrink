import { useState } from 'react';
import { Upload, MapPin, Trash2, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GPXData, WaterPoint, CurrentPosition } from '@/types';
import { parseGPX } from '@/utils/gpx-parser';
import { findWaterPoints, findCurrentPositionOnRoute } from '@/utils/overpass-api';

interface CircularControlsProps {
  onGpxLoad: (data: GPXData | null) => void;
  onWaterPointsLoad: (points: WaterPoint[]) => void;
  onCurrentPositionChange: (position: CurrentPosition | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onSettingsToggle: () => void;
  bufferDistance: number;
  waterFilterPreset: string;
  isLoading: boolean;
  gpxData: GPXData | null;
}

interface CircularButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

function CircularButton({ icon, onClick, className = '', disabled = false, loading = false }: CircularButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      className={`
        w-20 h-20 rounded-full 
        bg-black/80 backdrop-blur-sm
        border-2 border-white/20
        text-white
        flex items-center justify-center
        transition-all duration-200 ease-out
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:bg-black/90 hover:border-white/30
        shadow-lg
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled || loading}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        icon
      )}
    </button>
  );
}

export function CircularControls({
  onGpxLoad,
  onWaterPointsLoad,
  onCurrentPositionChange,
  onLoadingChange,
  onSettingsToggle,
  bufferDistance,
  waterFilterPreset,
  isLoading,
  gpxData
}: CircularControlsProps) {
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.error('Please upload a valid GPX file');
      return;
    }

    onLoadingChange(true);
    
    try {
      const text = await file.text();
      const gpxData = parseGPX(text);
      
      if (!gpxData || gpxData.coordinates.length === 0) {
        toast.error('Invalid GPX file or no track data found');
        return;
      }

      onGpxLoad(gpxData);
      toast.success(`Route loaded: ${gpxData.coordinates.length} points`);

      // Find water points along the route
      const waterPoints = await findWaterPoints(gpxData, bufferDistance, waterFilterPreset);
      onWaterPointsLoad(waterPoints);
      
      toast.success(`Found ${waterPoints.length} water points along the route`);
    } catch (error) {
      console.error('Error processing GPX file:', error);
      toast.error('Failed to process GPX file');
    } finally {
      onLoadingChange(false);
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gpx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleLocateClick = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        toast.success(`Located at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        // Update current position if we have GPX data
        if (gpxData) {
          const currentPos = findCurrentPositionOnRoute(latitude, longitude, gpxData);
          onCurrentPositionChange(currentPos);
        }
        
        // Trigger map to center on user location
        window.dispatchEvent(new CustomEvent('locate-user', {
          detail: { latitude, longitude }
        }));
      },
      () => {
        toast.error('Unable to retrieve your location');
      }
    );
  };

  const handleClearClick = () => {
    if (confirm('Clear route and all water points?')) {
      onGpxLoad(null);
      onWaterPointsLoad([]);
      onCurrentPositionChange(null);
      toast.success('Route cleared');
    }
  };

  return (
    <>
      {/* Upload Control - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <CircularButton
          icon={<Upload className="h-6 w-6" />}
          onClick={handleUploadClick}
          loading={isLoading}
        />
      </div>

      {/* Locate Control - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <CircularButton
          icon={<MapPin className="h-6 w-6" />}
          onClick={handleLocateClick}
        />
      </div>

      {/* Clear Control - Bottom Left */}
      <div className="absolute bottom-24 left-4 z-10">
        <CircularButton
          icon={<Trash2 className="h-6 w-6" />}
          onClick={handleClearClick}
          disabled={!gpxData}
        />
      </div>

      {/* Settings Control - Bottom Right */}
      <div className="absolute bottom-24 right-4 z-10">
        <CircularButton
          icon={<Settings className="h-6 w-6" />}
          onClick={onSettingsToggle}
        />
      </div>
    </>
  );
}
