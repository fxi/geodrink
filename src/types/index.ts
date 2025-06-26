export interface GPXData {
  name?: string;
  coordinates: [number, number][];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  totalDistance: number;
}

export interface WaterPoint {
  id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  distanceFromStart: number;
  distanceFromRoute: number;
  type: 'fountain' | 'well' | 'spring' | 'tap' | 'other';
}

export interface CurrentPosition {
  lat: number;
  lon: number;
  distanceAlongRoute: number;
}

export interface WaterFilterPreset {
  id: string;
  name: string;
  description: string;
  filters: {
    drinking_water?: string[];
    exclude_tags?: string[];
    include_types?: string[];
    access?: string[];
  };
}

export interface MapViewProps {
  gpxData: GPXData | null;
  waterPoints: WaterPoint[];
  currentPosition: CurrentPosition | null;
  selectedWaterPoint: WaterPoint | null;
  onWaterPointSelect: (waterPoint: WaterPoint | null) => void;
  className?: string;
}
