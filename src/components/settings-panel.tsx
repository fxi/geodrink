import { useState, useCallback, useEffect } from 'react';
import { Settings, Trash2, Download, Info, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { GPXData, WaterPoint } from '@/types';
import { CacheManager } from '@/utils/cache-manager';
import { findWaterPoints, WATER_FILTER_PRESETS } from '@/utils/overpass-api';

interface SettingsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bufferDistance: number;
  onBufferDistanceChange: (distance: number) => void;
  waterFilterPreset: string;
  onWaterFilterPresetChange: (preset: string) => void;
  gpxData: GPXData | null;
  waterPoints: WaterPoint[];
  onWaterPointsLoad: (points: WaterPoint[]) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
}

export function SettingsPanel({
  isOpen,
  onOpenChange,
  bufferDistance,
  onBufferDistanceChange,
  waterFilterPreset,
  onWaterFilterPresetChange,
  gpxData,
  waterPoints,
  onWaterPointsLoad,
  onLoadingChange,
  isLoading
}: SettingsPanelProps) {
  const [cacheInfo, setCacheInfo] = useState({ totalEntries: 0, totalSize: 0 });

  // Update cache info when panel opens
  useEffect(() => {
    if (isOpen) {
      const info = CacheManager.getCacheInfo();
      setCacheInfo(info);
    }
  }, [isOpen]);

  const handleBufferDistanceChange = useCallback((value: number[]) => {
    const distance = value[0];
    onBufferDistanceChange(distance);
  }, [onBufferDistanceChange]);

  // Refetch water points when buffer distance or filter preset changes
  useEffect(() => {
    if (gpxData && !isLoading) {
      const refetchWaterPoints = async () => {
        onLoadingChange(true);
        try {
          const waterPoints = await findWaterPoints(gpxData, bufferDistance, waterFilterPreset);
          onWaterPointsLoad(waterPoints);
          toast.success(`Updated: Found ${waterPoints.length} water points`);
        } catch (error) {
          console.error('Error refetching water points:', error);
          toast.error('Failed to update water points');
        } finally {
          onLoadingChange(false);
        }
      };
      
      const timeoutId = setTimeout(refetchWaterPoints, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [bufferDistance, waterFilterPreset, gpxData, onWaterPointsLoad, onLoadingChange, isLoading]);

  const clearCache = () => {
    CacheManager.clear();
    setCacheInfo({ totalEntries: 0, totalSize: 0 });
    toast.success('Cache cleared successfully');
  };

  const exportWaterPoints = () => {
    if (waterPoints.length === 0) {
      toast.error('No water points to export');
      return;
    }

    const csv = [
      ['Distance (km)', 'Type', 'Name', 'Latitude', 'Longitude', 'Access', 'Potable', 'Fee'],
      ...waterPoints.map(point => [
        (point.distanceFromStart / 1000).toFixed(2),
        point.type,
        point.tags?.name || point.tags?.['name:en'] || `${point.type} Point`,
        point.lat.toFixed(6),
        point.lon.toFixed(6),
        point.tags?.access || 'Unknown',
        point.tags?.drinking_water || 'Unknown',
        point.tags?.fee || 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `water-points-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Water points exported successfully');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-sm border-white/20 text-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings & Configuration
          </SheetTitle>
          <SheetDescription>
            Configure search parameters, manage cache, and export data
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Water Source Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-400" />
                Water Source Filter
              </CardTitle>
              <CardDescription>
                Choose what type of water sources to find along your route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="water-filter">Filter Preset</Label>
                <Select value={waterFilterPreset} onValueChange={onWaterFilterPresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select water filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATER_FILTER_PRESETS.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.name}</span>
                          <span className="text-xs text-muted-foreground">{preset.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-1" />
                {WATER_FILTER_PRESETS.find(p => p.id === waterFilterPreset)?.description || 'Filter water sources by quality and accessibility'}
              </div>
            </CardContent>
          </Card>

          {/* Buffer Distance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Buffer Distance</CardTitle>
              <CardDescription>
                Distance from the route to search for water points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="buffer-slider">Distance: {bufferDistance}m</Label>
                  <Badge variant="outline">{bufferDistance <= 15 ? 'Precise' : bufferDistance <= 50 ? 'Balanced' : 'Wide'}</Badge>
                </div>
                <Slider
                  id="buffer-slider"
                  min={5}
                  max={200}
                  step={5}
                  value={[bufferDistance]}
                  onValueChange={handleBufferDistanceChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5m (Precise)</span>
                  <span>200m (Wide)</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-1" />
                Lower values find fewer but more relevant water points. Higher values may include distant sources.
              </div>
            </CardContent>
          </Card>

          {/* Route Information */}
          {gpxData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Route Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Route Name</Label>
                    <p className="font-medium">{gpxData.name || 'Unnamed Route'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Distance</Label>
                    <p className="font-medium">{(gpxData.totalDistance / 1000).toFixed(1)} km</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Track Points</Label>
                    <p className="font-medium">{gpxData.coordinates.length.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Water Points Found</Label>
                    <p className="font-medium">{waterPoints.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cache Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cache Management</CardTitle>
              <CardDescription>
                Manage cached water point data to improve performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Cached Entries</Label>
                  <p className="font-medium">{cacheInfo.totalEntries}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cache Size</Label>
                  <p className="font-medium">{formatBytes(cacheInfo.totalSize)}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={clearCache}
                className="w-full"
                disabled={cacheInfo.totalEntries === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              
              <div className="text-xs text-muted-foreground">
                Cache automatically expires after 1 hour. Clearing cache will force fresh data retrieval.
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Data</CardTitle>
              <CardDescription>
                Export water points data for external use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportWaterPoints}
                className="w-full"
                disabled={waterPoints.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Water Points (CSV)
              </Button>
              
              {waterPoints.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  Will export {waterPoints.length} water points with coordinates and metadata
                </div>
              )}
            </CardContent>
          </Card>

          {/* Water Point Statistics */}
          {waterPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Water Point Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    waterPoints.reduce((acc, point) => {
                      acc[point.type] = (acc[point.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {type}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
