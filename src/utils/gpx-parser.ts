import { GPXData } from '@/types';

export function parseGPX(gpxText: string): GPXData | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    // Extract track points
    const trkpts = xmlDoc.querySelectorAll('trkpt');
    
    if (trkpts.length === 0) {
      // Try route points if no track points
      const rtepts = xmlDoc.querySelectorAll('rtept');
      if (rtepts.length === 0) {
        throw new Error('No track or route points found');
      }
    }

    const points = trkpts.length > 0 ? trkpts : xmlDoc.querySelectorAll('rtept');
    const coordinates: [number, number][] = [];
    
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    Array.from(points).forEach(point => {
      const lat = parseFloat(point.getAttribute('lat') || '0');
      const lon = parseFloat(point.getAttribute('lon') || '0');
      
      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lon, lat]); // [lng, lat] for maplibre
        
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
    });

    if (coordinates.length === 0) {
      throw new Error('No valid coordinates found');
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += calculateDistance(
        coordinates[i-1][1], coordinates[i-1][0],
        coordinates[i][1], coordinates[i][0]
      );
    }

    // Extract track name
    const trackName = xmlDoc.querySelector('trk > name')?.textContent || 
                     xmlDoc.querySelector('rte > name')?.textContent || 
                     xmlDoc.querySelector('metadata > name')?.textContent || 
                     undefined;

    return {
      name: trackName,
      coordinates,
      bounds: {
        north: maxLat,
        south: minLat,
        east: maxLon,
        west: minLon
      },
      totalDistance
    };
  } catch (error) {
    console.error('Error parsing GPX:', error);
    return null;
  }
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