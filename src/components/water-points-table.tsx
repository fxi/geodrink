import { useMemo } from 'react';
import { Droplets, Info, ExternalLink, MapPin } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WaterPoint, GPXData, CurrentPosition } from '@/types';
import { calculateDistanceFromCurrentPosition } from '@/utils/overpass-api';

interface WaterPointsTableProps {
  waterPoints: WaterPoint[];
  gpxData: GPXData | null;
  currentPosition: CurrentPosition | null;
  selectedWaterPoint: WaterPoint | null;
  onWaterPointSelect: (waterPoint: WaterPoint | null) => void;
}

export function WaterPointsTable({ 
  waterPoints, 
  gpxData, 
  currentPosition, 
  selectedWaterPoint,
  onWaterPointSelect 
}: WaterPointsTableProps) {
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
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Upload a GPX route to see water points</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Droplets className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Water Points ({waterPoints.length})</h3>
        </div>
        {waterPoints.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportData}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-[300px]">
        {waterPoints.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No water points found along this route</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  {currentPosition ? 'From You' : 'Distance'}
                </TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Info</TableHead>
                <TableHead className="w-16">Select</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedWaterPoints.map((point) => {
                const distance = currentPosition && gpxData
                  ? calculateDistanceFromCurrentPosition(point, currentPosition, gpxData)
                  : point.distanceFromStart;
                const isSelected = selectedWaterPoint?.id === point.id;
                
                return (
                  <TableRow 
                    key={point.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                    onClick={() => onWaterPointSelect(isSelected ? null : point)}
                  >
                    <TableCell className="font-mono">
                      {(distance / 1000).toFixed(1)}km
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={getTypeColor(point.type)}
                        >
                          {point.type}
                        </Badge>
                        <span className="font-medium">
                          {getWaterPointLabel(point)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getWaterPointInfo(point)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onWaterPointSelect(isSelected ? null : point);
                        }}
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
