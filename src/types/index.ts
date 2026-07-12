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

export interface LocationPoint {
  id: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  distanceFromStart: number;
  distanceFromRoute: number;
  type: 'fountain' | 'well' | 'spring' | 'tap' | 'restaurant' | 'supermarket' | 'fuel' | 'hospital' | 'graveyard' | 'other';
  category: 'water' | 'food' | 'fuel' | 'health' | 'services' | 'other';
  amenityType: string;
}

// Keep WaterPoint for backward compatibility
export interface WaterPoint extends LocationPoint {
  type: 'fountain' | 'well' | 'spring' | 'tap' | 'other';
  category: 'water';
}

export interface CurrentPosition {
  lat: number;
  lon: number;
  distanceAlongRoute: number;
}

export interface LocationFilters {
  drinkingWater: boolean;
  restaurants: boolean;
  supermarkets: boolean;
  gasStations: boolean;
  hospitals: boolean;
  graveyards: boolean;
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
  locationPoints: LocationPoint[];
  currentPosition: CurrentPosition | null;
  selectedWaterPoint: WaterPoint | null;
  selectedLocationPoint: LocationPoint | null;
  onWaterPointSelect: (waterPoint: WaterPoint | null) => void;
  onLocationPointSelect: (locationPoint: LocationPoint | null) => void;
  className?: string;
}
