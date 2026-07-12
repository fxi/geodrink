import { LocationPoint } from '@/types';

export function exportLocationPointsAsGPX(
  locationPoints: LocationPoint[],
  routeName: string = 'Route Points'
): void {
  if (locationPoints.length === 0) {
    throw new Error('No location points to export');
  }

  const gpxContent = generateGPXContent(locationPoints, routeName);
  
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${routeName.toLowerCase().replace(/\s+/g, '-')}-waypoints-${new Date().toISOString().split('T')[0]}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

function generateGPXContent(locationPoints: LocationPoint[], routeName: string): string {
  const waypoints = locationPoints.map(point => {
    const name = point.tags?.name || point.tags?.['name:en'] || `${point.type} Point`;
    const description = generatePointDescription(point);
    const symbol = getGPXSymbol(point.type);
    
    return `    <wpt lat="${point.lat.toFixed(6)}" lon="${point.lon.toFixed(6)}">
      <name><![CDATA[${name}]]></name>
      <desc><![CDATA[${description}]]></desc>
      <sym>${symbol}</sym>
      <type>${point.category}</type>
      <extensions>
        <amenity>${point.amenityType}</amenity>
        <distance_from_start>${(point.distanceFromStart / 1000).toFixed(2)}km</distance_from_start>
        <distance_from_route>${point.distanceFromRoute.toFixed(0)}m</distance_from_route>
      </extensions>
    </wpt>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GeoDrink" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name><![CDATA[${routeName} - Waypoints]]></name>
    <desc><![CDATA[Location points exported from GeoDrink]]></desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypoints}
</gpx>`;
}

function generatePointDescription(point: LocationPoint): string {
  const parts: string[] = [];
  
  // Add type and category
  parts.push(`Type: ${point.type} (${point.category})`);
  
  // Add distance information
  parts.push(`Distance from start: ${(point.distanceFromStart / 1000).toFixed(2)}km`);
  parts.push(`Distance from route: ${point.distanceFromRoute.toFixed(0)}m`);
  
  // Add relevant tags
  if (point.tags?.access) parts.push(`Access: ${point.tags.access}`);
  if (point.tags?.opening_hours) parts.push(`Hours: ${point.tags.opening_hours}`);
  if (point.tags?.phone) parts.push(`Phone: ${point.tags.phone}`);
  if (point.tags?.website) parts.push(`Website: ${point.tags.website}`);
  if (point.tags?.cuisine) parts.push(`Cuisine: ${point.tags.cuisine}`);
  if (point.tags?.fuel) parts.push(`Fuel types: ${point.tags.fuel}`);
  if (point.tags?.drinking_water) parts.push(`Drinking water: ${point.tags.drinking_water}`);
  if (point.tags?.fee) parts.push(`Fee: ${point.tags.fee}`);
  
  return parts.join(' | ');
}

function getGPXSymbol(type: LocationPoint['type']): string {
  const symbolMap: Record<LocationPoint['type'], string> = {
    'fountain': 'Water Source',
    'well': 'Water Source',
    'spring': 'Water Source',
    'tap': 'Water Source',
    'restaurant': 'Restaurant',
    'supermarket': 'Shopping Center',
    'fuel': 'Gas Station',
    'hospital': 'Medical Facility',
    'graveyard': 'Cemetery',
    'other': 'Waypoint'
  };
  
  return symbolMap[type] || 'Waypoint';
}
