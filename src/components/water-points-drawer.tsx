import { useState, useMemo } from 'react';
import { Droplets, Info, ExternalLink, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WaterPoint, GPXData, CurrentPosition } from '@/types';
import { calculateDistanceFromCurrentPosition } from '@/utils/overpass-api';

interface WaterPointsDrawerProps {
  waterPoints: WaterPoint[];
  gpxData: GPXData | null;
  currentPosition: CurrentPosition | null;
  selectedWaterPoint: WaterPoint | null;
  onWaterPointSelect: (waterPoint: WaterPoint | null) => void;
}

export function WaterPointsDrawer({ 
  waterPoints, 
  gpxData, 
  currentPosition, 
  selectedWaterPoint,
  onWaterPointSelect 
}: WaterPointsDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedWaterPoints = useMemo(() => {
    if (!gpxData) return waterPoints;
    
    return [...waterPoints].sort((a, b) => {
      if (currentPosition) {
        const distanceA = calculateDistanceFromCurrentPosition(a, currentPosition, gpxData);
        const distanceB = calculateDistanceFromCurrentPosition(b, currentPosition, gpxData);
        return distanceA - distanceB;
      }
      return a.distanceFromStart - b.distanceFromStart;
    });
  }, [waterPoints, currentPosition, gpxData]);

  const getWaterPointLabel = (point: WaterPoint) => {
    const name = point.tags?.name || point.tags?.['name:en'];
    if (name) return name;
    
    const type = point.type.charAt(0).toUpperCase() + point.type.slice(1);
    return `${type} Point`;
  };

  const getWaterPointInfo = (point: WaterPoint) => {
    const info = [];
    
    if (point.tags?.access) {
      info.push(`Access: ${point.tags.access}`);
    }
    
    if (point.tags?.drinking_water === 'yes') {
      info.push('Potable water');
    } else if (point.tags?.drinking_water === 'no') {
      info.push('Non-potable');
    }
    
    if (point.tags?.fee === 'yes') {
      info.push('Fee required');
    }
    
    return info.length > 0 ? info.join(' • ') : 'Water point';
  };

  const getWaterQualityBadge = (point: WaterPoint) => {
    const drinkingWater = point.tags?.drinking_water;
    const fee = point.tags?.fee;
    
    if (drinkingWater === 'yes') {
      if (fee === 'yes') {
        return { color: 'bg-blue-500 text-white', label: 'Potable (Paid)', icon: '🔵' };
      } else {
        return { color: 'bg-green-500 text-white', label: 'Potable & Free', icon: '🟢' };
      }
    } else if (drinkingWater === 'no') {
      return { color: 'bg-red-500 text-white', label: 'Non-Potable', icon: '🔴' };
    } else {
      return { color: 'bg-yellow-500 text-black', label: 'Unknown Quality', icon: '🟡' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fountain': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'well': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'spring': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'tap': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const exportData = () => {
    const csv = [
      ['Distance (km)', 'Type', 'Name', 'Latitude', 'Longitude', 'Info'],
      ...sortedWaterPoints.map(point => [
        (point.distanceFromStart / 1000).toFixed(2),
        point.type,
        getWaterPointLabel(point),
        point.lat.toFixed(6),
        point.lon.toFixed(6),
        getWaterPointInfo(point)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'water-points.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!gpxData) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="bg-black/90 backdrop-blur-sm border-t border-white/20 p-4">
          <div className="flex items-center justify-center text-white/60">
            <Droplets className="h-5 w-5 mr-2" />
            <span>Upload a GPX route to see water points</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        absolute bottom-0 left-0 right-0 z-20
        bg-black/95 backdrop-blur-sm border-t border-white/20
        transition-all duration-300 ease-out
        ${isExpanded ? 'h-[60vh]' : 'h-16'}
      `}
    >
      {/* Drawer Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2 text-white">
          <Droplets className="h-5 w-5 text-blue-400" />
          <span className="font-semibold">Water Points ({waterPoints.length})</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {waterPoints.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                exportData();
              }}
              className="text-white hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronUp className="h-5 w-5 text-white/60" />
          )}
        </div>
      </div>

      {/* Drawer Content */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          {waterPoints.length === 0 ? (
            <div className="p-8 text-center text-white/60">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No water points found along this route</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(60vh-4rem)]">
              <div className="space-y-2 p-4 pt-0">
                {sortedWaterPoints.map((point) => {
                  const distance = currentPosition && gpxData
                    ? calculateDistanceFromCurrentPosition(point, currentPosition, gpxData)
                    : point.distanceFromStart;
                  const isSelected = selectedWaterPoint?.id === point.id;
                  
                  return (
                    <div
                      key={point.id}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-all duration-200
                        border border-white/10
                        ${isSelected 
                          ? 'bg-blue-500/20 border-blue-400/50' 
                          : 'bg-white/5 hover:bg-white/10'
                        }
                      `}
                      onClick={() => onWaterPointSelect(isSelected ? null : point)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge 
                              variant="secondary" 
                              className={`${getTypeColor(point.type)} text-xs`}
                            >
                              {point.type}
                            </Badge>
                            {(() => {
                              const qualityBadge = getWaterQualityBadge(point);
                              return (
                                <Badge 
                                  className={`${qualityBadge.color} text-xs`}
                                >
                                  {qualityBadge.icon} {qualityBadge.label}
                                </Badge>
                              );
                            })()}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium text-white text-sm truncate">
                              {getWaterPointLabel(point)}
                            </span>
                          </div>
                          
                          <div className="text-xs text-white/60 mb-1">
                            {getWaterPointInfo(point)}
                          </div>
                          
                          <div className="text-xs font-mono text-blue-400">
                            {(distance / 1000).toFixed(1)}km {currentPosition ? 'from you' : 'from start'}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`
                            ml-2 p-2 h-8 w-8
                            ${isSelected 
                              ? 'text-blue-400 bg-blue-500/20' 
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                            }
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onWaterPointSelect(isSelected ? null : point);
                          }}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
