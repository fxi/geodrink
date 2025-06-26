import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Trash2, ZoomIn, ZoomOut, MapPin, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { GPXData, WaterPoint, CurrentPosition } from '@/types';
import { parseGPX } from '@/utils/gpx-parser';
import { findWaterPoints, findCurrentPositionOnRoute } from '@/utils/overpass-api';

interface ControlPanelProps {
  onGpxLoad: (data: GPXData | null) => void;
  onWaterPointsLoad: (points: WaterPoint[]) => void;
  onCurrentPositionChange: (position: CurrentPosition | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocateUser: () => void;
  bufferDistance: number;
  onBufferDistanceChange: (distance: number) => void;
  gpxData: GPXData | null;
  isLoading: boolean;
}

export function ControlPanel({
  onGpxLoad,
  onWaterPointsLoad,
  onCurrentPositionChange,
  onLoadingChange,
  onZoomIn,
  onZoomOut,
  onLocateUser,
  bufferDistance,
  onBufferDistanceChange,
  gpxData,
  isLoading
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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
      const waterPoints = await findWaterPoints(gpxData, bufferDistance);
      onWaterPointsLoad(waterPoints);
      
      toast.success(`Found ${waterPoints.length} water points along the route`);
    } catch (error) {
      console.error('Error processing GPX file:', error);
      toast.error('Failed to process GPX file');
    } finally {
      onLoadingChange(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const clearRoute = () => {
    onGpxLoad(null);
    onWaterPointsLoad([]);
    onCurrentPositionChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Route cleared');
  };

  const handleGeolocation = () => {
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
        
        onLocateUser();
      },
      () => {
        toast.error('Unable to retrieve your location');
      }
    );
  };

  const handleBufferDistanceChange = useCallback((value: string) => {
    const distance = parseInt(value, 10);
    if (!isNaN(distance) && distance > 0 && distance <= 1000) {
      onBufferDistanceChange(distance);
    }
  }, [onBufferDistanceChange]);

  // Refetch water points when buffer distance changes
  useEffect(() => {
    if (gpxData && !isLoading) {
      const refetchWaterPoints = async () => {
        onLoadingChange(true);
        try {
          const waterPoints = await findWaterPoints(gpxData, bufferDistance);
          onWaterPointsLoad(waterPoints);
          toast.success(`Updated: Found ${waterPoints.length} water points`);
        } catch (error) {
          console.error('Error refetching water points:', error);
          toast.error('Failed to update water points');
        } finally {
          onLoadingChange(false);
        }
      };
      
      refetchWaterPoints();
    }
  }, [bufferDistance, gpxData, onWaterPointsLoad, onLoadingChange, isLoading]);

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="space-y-2">
        <Label htmlFor="gpx-upload">Upload GPX Route</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' 
              : 'border-gray-300 dark:border-gray-700'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <Input
            ref={fileInputRef}
            id="gpx-upload"
            type="file"
            accept=".gpx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drop GPX file here or click to browse
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Buffer Distance Setting */}
      <div className="space-y-2">
        <Label htmlFor="buffer-distance">Search Buffer Distance (meters)</Label>
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <Input
            id="buffer-distance"
            type="number"
            min="10"
            max="1000"
            value={bufferDistance}
            onChange={(e) => handleBufferDistanceChange(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-gray-500">meters</span>
        </div>
      </div>

      {/* Route Info */}
      {gpxData && (
        <Alert>
          <AlertDescription>
            Route loaded with {gpxData.coordinates.length} points
            {gpxData.name && <span> • {gpxData.name}</span>}
          </AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4 mr-2" />
          Zoom In
        </Button>
        <Button variant="outline" size="sm" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4 mr-2" />
          Zoom Out
        </Button>
        <Button variant="outline" size="sm" onClick={handleGeolocation}>
          <MapPin className="h-4 w-4 mr-2" />
          Locate
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!gpxData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Route?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the current route and all water points. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearRoute}>
                Clear Route
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
