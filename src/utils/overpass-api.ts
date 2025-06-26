import { GPXData, WaterPoint, CurrentPosition, WaterFilterPreset } from '@/types';
import { CacheManager } from './cache-manager';

// Water filter presets for different use cases
export const WATER_FILTER_PRESETS: WaterFilterPreset[] = [
  {
    id: 'potable-only',
    name: 'Potable Water Only',
    description: 'Safe drinking water sources only',
    filters: {
      drinking_water: ['yes'],
      exclude_tags: ['fee=yes']
    }
  },
  {
    id: 'free-potable',
    name: 'Free Potable Water',
    description: 'Free drinking water only',
    filters: {
      drinking_water: ['yes'],
      exclude_tags: ['fee=yes']
    }
  },
  {
    id: 'all-potable',
    name: 'All Potable Water',
    description: 'All drinking water (including paid)',
    filters: {
      drinking_water: ['yes']
    }
  },
  {
    id: 'emergency-sources',
    name: 'Emergency Sources',
    description: 'All water sources including wells/springs',
    filters: {
      include_types: ['fountain', 'well', 'spring', 'tap'],
      access: ['public', 'yes']
    }
  },
  {
    id: 'all-sources',
    name: 'All Water Sources',
    description: 'All water points (including non-potable)',
    filters: {}
  }
];

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function findWaterPoints(
  gpxData: GPXData, 
  bufferDistance: number = 15, 
  filterPreset: string = 'potable-only'
): Promise<WaterPoint[]> {
  try {
    // Check cache first (include filter in cache key)
    const cacheKey = CacheManager.generateCacheKey(gpxData.bounds, bufferDistance) + `_${filterPreset}`;
    const cachedData = CacheManager.get<WaterPoint[]>(cacheKey);
    
    if (cachedData) {
      console.log('Using cached water points data');
      return cachedData;
    }

    const preset = WATER_FILTER_PRESETS.find(p => p.id === filterPreset) || WATER_FILTER_PRESETS[0];
    const query = buildOverpassQuery(gpxData, bufferDistance, preset);
    
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const waterPoints: WaterPoint[] = [];

    // Process nodes (points)
    if (data.elements) {
      for (const element of data.elements) {
        if (element.type === 'node' && element.lat && element.lon) {
          const waterPoint = processWaterPoint(element, gpxData, bufferDistance, preset);
          if (waterPoint) {
            waterPoints.push(waterPoint);
          }
        }
      }
    }

    // Sort by distance from start
    const sortedWaterPoints = waterPoints.sort((a, b) => a.distanceFromStart - b.distanceFromStart);
    
    // Cache the results
    CacheManager.set(cacheKey, sortedWaterPoints, gpxData.bounds, bufferDistance);
    
    return sortedWaterPoints;
  } catch (error) {
    console.error('Error fetching water points:', error);
    return [];
  }
}

function buildOverpassQuery(gpxData: GPXData, bufferDistance: number, preset: WaterFilterPreset): string {
  const { bounds } = gpxData;
  
  // Convert buffer distance from meters to degrees (rough approximation)
  const padding = bufferDistance / 111000; // 1 degree ≈ 111km
  const bbox = `${bounds.south - padding},${bounds.west - padding},${bounds.north + padding},${bounds.east + padding}`;

  // Build query based on filter preset
  const queries: string[] = [];
  
  if (preset.filters.drinking_water?.includes('yes')) {
    // Only potable water sources
    queries.push(`node["amenity"="drinking_water"]["drinking_water"!="no"](${bbox});`);
    queries.push(`node["amenity"="fountain"]["drinking_water"="yes"](${bbox});`);
    queries.push(`node["amenity"="water_point"]["drinking_water"="yes"](${bbox});`);
    queries.push(`node["amenity"="water_tap"]["drinking_water"="yes"](${bbox});`);
  } else {
    // All water sources (original behavior)
    queries.push(`node["amenity"="drinking_water"](${bbox});`);
    queries.push(`node["amenity"="fountain"](${bbox});`);
    queries.push(`node["amenity"="water_point"](${bbox});`);
    queries.push(`node["man_made"="water_well"](${bbox});`);
    queries.push(`node["natural"="spring"](${bbox});`);
    queries.push(`node["amenity"="water_tap"](${bbox});`);
  }

  return `
    [out:json][timeout:30];
    (
      ${queries.join('\n      ')}
    );
    out geom;
  `;
}

function processWaterPoint(
  element: { lat: number; lon: number; tags?: Record<string, string>; id: number }, 
  gpxData: GPXData, 
  bufferDistance: number,
  preset: WaterFilterPreset
): WaterPoint | null {
  const { lat, lon, tags = {}, id } = element;
  
  // Determine water point type
  let type: WaterPoint['type'] = 'other';
  if (tags.amenity === 'drinking_water') type = 'fountain';
  else if (tags.amenity === 'fountain') type = 'fountain';
  else if (tags.amenity === 'water_point') type = 'tap';
  else if (tags.amenity === 'water_tap') type = 'tap';
  else if (tags.man_made === 'water_well') type = 'well';
  else if (tags.natural === 'spring') type = 'spring';

  // Calculate distance from route start
  const distanceFromStart = calculateDistanceFromStart(lat, lon, gpxData);
  
  // Calculate minimum distance from route
  const distanceFromRoute = calculateMinDistanceFromRoute(lat, lon, gpxData);
  
  // Filter points that are too far from the route
  if (distanceFromRoute > bufferDistance) {
    return null;
  }

  // Apply preset filters
  if (preset.filters.exclude_tags) {
    for (const excludeTag of preset.filters.exclude_tags) {
      const [key, value] = excludeTag.split('=');
      if (tags[key] === value) {
        return null; // Exclude this point
      }
    }
  }

  // Filter by access if specified
  if (preset.filters.access && tags.access) {
    if (!preset.filters.access.includes(tags.access)) {
      return null;
    }
  }

  // Filter by drinking water quality if specified
  if (preset.filters.drinking_water) {
    const drinkingWater = tags.drinking_water;
    if (drinkingWater && !preset.filters.drinking_water.includes(drinkingWater)) {
      return null;
    }
  }

  return {
    id: id.toString(),
    lat,
    lon,
    tags,
    distanceFromStart,
    distanceFromRoute,
    type
  };
}

export function calculateDistanceFromCurrentPosition(
  waterPoint: WaterPoint, 
  currentPosition: CurrentPosition | null, 
  gpxData: GPXData
): number {
  if (!currentPosition) {
    return waterPoint.distanceFromStart;
  }

  // Find the water point's position along the route
  const waterPointDistanceAlongRoute = findDistanceAlongRoute(waterPoint.lat, waterPoint.lon, gpxData);
  
  // Calculate the difference from current position
  return Math.abs(waterPointDistanceAlongRoute - currentPosition.distanceAlongRoute);
}

export function findDistanceAlongRoute(lat: number, lon: number, gpxData: GPXData): number {
  if (gpxData.coordinates.length === 0) return 0;

  let minDistance = Infinity;
  let closestSegmentIndex = 0;
  let closestPointOnSegment: [number, number] = [0, 0];

  // Find the closest point on the route
  for (let i = 0; i < gpxData.coordinates.length - 1; i++) {
    const segmentStart = gpxData.coordinates[i];
    const segmentEnd = gpxData.coordinates[i + 1];
    
    const closestPoint = getClosestPointOnSegment(
      [lon, lat],
      segmentStart,
      segmentEnd
    );
    
    const distance = calculateDistance(lat, lon, closestPoint[1], closestPoint[0]);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestSegmentIndex = i;
      closestPointOnSegment = closestPoint;
    }
  }

  // Calculate distance along route to the closest point
  let distanceAlongRoute = 0;
  for (let i = 0; i < closestSegmentIndex; i++) {
    distanceAlongRoute += calculateDistance(
      gpxData.coordinates[i][1], gpxData.coordinates[i][0],
      gpxData.coordinates[i + 1][1], gpxData.coordinates[i + 1][0]
    );
  }

  // Add distance from segment start to closest point
  distanceAlongRoute += calculateDistance(
    gpxData.coordinates[closestSegmentIndex][1], gpxData.coordinates[closestSegmentIndex][0],
    closestPointOnSegment[1], closestPointOnSegment[0]
  );

  return distanceAlongRoute;
}

function getClosestPointOnSegment(
  point: [number, number],
  segmentStart: [number, number],
  segmentEnd: [number, number]
): [number, number] {
  const [px, py] = point;
  const [ax, ay] = segmentStart;
  const [bx, by] = segmentEnd;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return segmentStart;
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));

  return [ax + t * dx, ay + t * dy];
}

export function findCurrentPositionOnRoute(userLat: number, userLon: number, gpxData: GPXData): CurrentPosition | null {
  if (!gpxData || gpxData.coordinates.length === 0) return null;

  const distanceAlongRoute = findDistanceAlongRoute(userLat, userLon, gpxData);

  return {
    lat: userLat,
    lon: userLon,
    distanceAlongRoute
  };
}

function calculateDistanceFromStart(lat: number, lon: number, gpxData: GPXData): number {
  if (gpxData.coordinates.length === 0) return 0;
  
  const startPoint = gpxData.coordinates[0];
  return calculateDistance(startPoint[1], startPoint[0], lat, lon);
}

function calculateMinDistanceFromRoute(lat: number, lon: number, gpxData: GPXData): number {
  let minDistance = Infinity;
  
  for (const coord of gpxData.coordinates) {
    const distance = calculateDistance(coord[1], coord[0], lat, lon);
    minDistance = Math.min(minDistance, distance);
  }
  
  return minDistance;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
