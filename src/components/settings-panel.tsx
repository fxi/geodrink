import { useState, useCallback, useEffect } from 'react';
import { Settings, Trash2, Download, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { GPXData, LocationPoint, LocationFilters } from '@/types';
import { CacheManager } from '@/utils/cache-manager';
import { findLocationPoints } from '@/utils/overpass-api';
import { exportLocationPointsAsGPX } from '@/utils/gpx-export';
import { LOCATION_ICONS } from '@/utils/location-icons';

interface SettingsPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bufferDistance: number;
  onBufferDistanceChange: (distance: number) => void;
  locationFilters: LocationFilters;
  onLocationFiltersChange: (filters: LocationFilters) => void;
  gpxData: GPXData | null;
  locationPoints: LocationPoint[];
  onLocationPointsLoad: (points: LocationPoint[]) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
}

export function SettingsPanel({
  isOpen,
  onOpenChange,
  bufferDistance,
  onBufferDistanceChange,
  locationFilters,
  onLocationFiltersChange,
  gpxData,
  locationPoints,
  onLocationPointsLoad,
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

  const handleFilterChange = useCallback((filterKey: keyof LocationFilters, checked: boolean) => {
    onLocationFiltersChange({
      ...locationFilters,
      [filterKey]: checked
    });
  }, [locationFilters, onLocationFiltersChange]);

  // Refetch location points when buffer distance or filters change
  useEffect(() => {
    if (gpxData && !isLoading) {
      const hasActiveFilters = Object.values(locationFilters).some(Boolean);
      if (!hasActiveFilters) {
        onLocationPointsLoad([]);
        return;
      }

      const refetchLocationPoints = async () => {
        onLoadingChange(true);
        try {
          const points = await findLocationPoints(gpxData, bufferDistance, locationFilters);
          onLocationPointsLoad(points);
          toast.success(`Updated: Found ${points.length} location points`);
        } catch (error) {
          console.error('Error refetching location points:', error);
          toast.error('Failed to update location points');
        } finally {
          onLoadingChange(false);
        }
      };
      
      const timeoutId = setTimeout(refetchLocationPoints, 500); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [bufferDistance, locationFilters, gpxData, onLocationPointsLoad, onLoadingChange, isLoading]);

  const clearCache = () => {
    CacheManager.clear();
    setCacheInfo({ totalEntries: 0, totalSize: 0 });
    toast.success('Cache cleared successfully');
  };

  const exportLocationPoints = () => {
    if (locationPoints.length === 0) {
      toast.error('No location points to export');
      return;
    }

    try {
      exportLocationPointsAsGPX(locationPoints, gpxData?.name || 'Route Points');
      toast.success('Location points exported as GPX successfully');
    } catch (error) {
      console.error('Error exporting GPX:', error);
      toast.error('Failed to export location points');
    }
  };

  const exportCSV = () => {
    if (locationPoints.length === 0) {
      toast.error('No location points to export');
      return;
    }

    const csv = [
      ['Distance (km)', 'Type', 'Category', 'Name', 'Latitude', 'Longitude', 'Access', 'Opening Hours'],
      ...locationPoints.map(point => [
        (point.distanceFromStart / 1000).toFixed(2),
        point.type,
        point.category,
        point.tags?.name || point.tags?.['name:en'] || `${point.type} Point`,
        point.lat.toFixed(6),
        point.lon.toFixed(6),
        point.tags?.access || 'Unknown',
        point.tags?.opening_hours || 'Unknown'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-points-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Location points exported as CSV successfully');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filterOptions = [
    { 
      key: 'drinkingWater' as const, 
      label: LOCATION_ICONS.drinkingWater.label, 
      icon: LOCATION_ICONS.drinkingWater.icon, 
      color: 'text-blue-400' 
    },
    { 
      key: 'restaurants' as const, 
      label: LOCATION_ICONS.restaurants.label, 
      icon: LOCATION_ICONS.restaurants.icon, 
      color: 'text-orange-400' 
    },
    { 
      key: 'supermarkets' as const, 
      label: LOCATION_ICONS.supermarkets.label, 
      icon: LOCATION_ICONS.supermarkets.icon, 
      color: 'text-green-400' 
    },
    { 
      key: 'gasStations' as const, 
      label: LOCATION_ICONS.gasStations.label, 
      icon: LOCATION_ICONS.gasStations.icon, 
      color: 'text-red-400' 
    },
    { 
      key: 'hospitals' as const, 
      label: LOCATION_ICONS.hospitals.label, 
      icon: LOCATION_ICONS.hospitals.icon, 
      color: 'text-red-600' 
    },
    { 
      key: 'graveyards' as const, 
      label: LOCATION_ICONS.graveyards.label, 
      icon: LOCATION_ICONS.graveyards.icon, 
      color: 'text-gray-400' 
    },
  ];

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
          {/* Location Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-400" />
                Location Filters
              </CardTitle>
              <CardDescription>
                Select the types of locations to find along your route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {filterOptions.map(({ key, label, icon: Icon, color }) => (
                  <div key={key} className="flex items-center space-x-3">
                    <Checkbox
                      id={key}
                      checked={locationFilters[key]}
                      onCheckedChange={(checked) => handleFilterChange(key, checked as boolean)}
                    />
                    <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer text-white">
                      <Icon className={`h-4 w-4 ${color}`} />
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-1" />
                Select multiple location types to find various amenities along your route
              </div>
            </CardContent>
          </Card>

          {/* Buffer Distance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Buffer Distance</CardTitle>
              <CardDescription>
                Distance from the route to search for location points
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
                Lower values find fewer but more relevant points. Higher values may include distant locations.
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
                    <Label className="text-muted-foreground">Location Points Found</Label>
                    <p className="font-medium">{locationPoints.length}</p>
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
                Manage cached location data to improve performance
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
                Export location points data for external use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={exportLocationPoints}
                className="w-full"
                disabled={locationPoints.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as GPX Waypoints
              </Button>
              
              <Button 
                onClick={exportCSV}
                variant="outline"
                className="w-full"
                disabled={locationPoints.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              
              {locationPoints.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Will export {locationPoints.length} location points with coordinates and metadata
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Point Statistics */}
          {locationPoints.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    locationPoints.reduce((acc, point) => {
                      acc[point.category] = (acc[point.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {category}
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
