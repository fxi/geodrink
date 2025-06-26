import { GPXData, WaterPoint } from '@/types';

export function createRouteGeoJSON(gpxData: GPXData) {
  return {
    type: 'Feature' as const,
    properties: {
      name: gpxData.name || 'Route'
    },
    geometry: {
      type: 'LineString' as const,
      coordinates: gpxData.coordinates
    }
  };
}

export function createWaterPointsGeoJSON(waterPoints: WaterPoint[]) {
  return {
    type: 'FeatureCollection' as const,
    features: waterPoints.map(point => ({
      type: 'Feature' as const,
      properties: {
        id: point.id,
        type: point.type,
        name: getWaterPointName(point),
        info: getWaterPointInfo(point),
        distanceFromStart: point.distanceFromStart,
        distanceFromRoute: point.distanceFromRoute,
        lat: point.lat,
        lon: point.lon
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [point.lon, point.lat] as [number, number]
      }
    }))
  };
}

export function createGraticuleCross(lat: number, lon: number, extent: number = 0.01) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      // Horizontal line (latitude)
      {
        type: 'Feature' as const,
        properties: { type: 'graticule-lat' },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [lon - extent, lat],
            [lon + extent, lat]
          ] as [number, number][]
        }
      },
      // Vertical line (longitude)
      {
        type: 'Feature' as const,
        properties: { type: 'graticule-lon' },
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [lon, lat - extent],
            [lon, lat + extent]
          ] as [number, number][]
        }
      }
    ]
  };
}

function getWaterPointName(point: WaterPoint): string {
  const name = point.tags?.name || point.tags?.['name:en'];
  if (name) return name;
  
  const type = point.type.charAt(0).toUpperCase() + point.type.slice(1);
  return `${type} Point`;
}

function getWaterPointInfo(point: WaterPoint): string {
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
}
