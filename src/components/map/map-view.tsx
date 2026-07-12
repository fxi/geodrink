import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapViewProps, LocationPoint, WaterPoint } from '@/types';
import { createRouteGeoJSON } from '@/utils/map-utils';
import { LOCATION_ICONS } from '@/utils/location-icons';

export interface MapViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  locateUser: () => void;
  getMap: () => maplibregl.Map | null;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>(({ 
  gpxData, 
  waterPoints, 
  locationPoints,
  currentPosition,
  selectedWaterPoint,
  selectedLocationPoint,
  onWaterPointSelect,
  onLocationPointSelect,
  className 
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (map.current) {
        map.current.zoomIn();
      }
    },
    zoomOut: () => {
      if (map.current) {
        map.current.zoomOut();
      }
    },
    locateUser: () => {
      if (!navigator.geolocation || !map.current) return;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            duration: 2000
          });
          
          // Add or update user location marker
          if (map.current?.getSource('user-location')) {
            (map.current.getSource('user-location') as maplibregl.GeoJSONSource).setData({
              type: 'Point',
              coordinates: [longitude, latitude]
            });
          } else {
            map.current?.addSource('user-location', {
              type: 'geojson',
              data: {
                type: 'Point',
                coordinates: [longitude, latitude]
              }
            });

            map.current?.addLayer({
              id: 'user-location',
              type: 'circle',
              source: 'user-location',
              paint: {
                'circle-radius': 10,
                'circle-color': '#FF6B6B',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff'
              }
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    },
    getMap: () => map.current
  }));

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with MapTiler vector tiles
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/outdoor-v2/style.json?key=sZ1OmwWx9EEcSEyGWBa8',
      center: [2.3522, 48.8566], // Paris default
      zoom: 10
    });

    // Listen for locate user events from circular controls
    const handleLocateUser = (event: CustomEvent) => {
      const { latitude, longitude } = event.detail;
      map.current?.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 2000
      });
      
      // Add or update user location marker
      if (map.current?.getSource('user-location')) {
        (map.current.getSource('user-location') as maplibregl.GeoJSONSource).setData({
          type: 'Point',
          coordinates: [longitude, latitude]
        });
      } else {
        map.current?.addSource('user-location', {
          type: 'geojson',
          data: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        });

        map.current?.addLayer({
          id: 'user-location',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 10,
            'circle-color': '#FF6B6B',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff'
          }
        });
      }
    };

    window.addEventListener('locate-user', handleLocateUser as EventListener);

    return () => {
      window.removeEventListener('locate-user', handleLocateUser as EventListener);
      map.current?.remove();
    };
  }, []);

  // Update route when GPX data changes
  useEffect(() => {
    if (!map.current || !gpxData) return;

    const routeGeoJSON = createRouteGeoJSON(gpxData);

    // Remove existing route if it exists
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Add route source and layer
    map.current.addSource('route', {
      type: 'geojson',
      data: routeGeoJSON
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3B82F6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Fit map to route bounds
    const bounds = new maplibregl.LngLatBounds();
    gpxData.coordinates.forEach(coord => bounds.extend(coord));
    map.current.fitBounds(bounds, { padding: 50 });

  }, [gpxData]);

  // Helper function to create unified HTML marker element for both water points and location points
  const createMarkerElement = (point: LocationPoint | WaterPoint): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    // Get the appropriate icon and color from the shared system
    let iconData;
    if (point.category === 'water') {
      iconData = LOCATION_ICONS.drinkingWater;
    } else if (point.type === 'restaurant') {
      iconData = LOCATION_ICONS.restaurants;
    } else if (point.type === 'supermarket') {
      iconData = LOCATION_ICONS.supermarkets;
    } else if (point.type === 'fuel') {
      iconData = LOCATION_ICONS.gasStations;
    } else if (point.type === 'hospital') {
      iconData = LOCATION_ICONS.hospitals;
    } else if (point.type === 'graveyard') {
      iconData = LOCATION_ICONS.graveyards;
    } else {
      iconData = LOCATION_ICONS.drinkingWater; // fallback
    }
    
    el.innerHTML = `
      <div style="
        background: ${iconData.color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        ${iconData.emoji}
      </div>
    `;
    
    return el;
  };

  // Helper function to create popup content with Google Maps integration
  const createPopupContent = (point: LocationPoint | WaterPoint): string => {
    const name = point.tags?.name || point.tags?.['name:en'] || `${point.type} Point`;
    const googleMapsUrl = `https://www.google.com/maps?q=${point.lat},${point.lon}`;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lon}`;
    
    return `
      <div class="p-3 min-w-[250px]">
        <h3 class="font-semibold text-lg mb-2">${name}</h3>
        <div class="space-y-1 text-sm text-gray-600 mb-3">
          <p><strong>Type:</strong> ${point.type} (${point.category})</p>
          <p><strong>Distance:</strong> ${(point.distanceFromStart / 1000).toFixed(1)}km from start</p>
          ${point.tags?.opening_hours ? `<p><strong>Hours:</strong> ${point.tags.opening_hours}</p>` : ''}
          ${point.tags?.phone ? `<p><strong>Phone:</strong> ${point.tags.phone}</p>` : ''}
          ${point.tags?.website ? `<p><strong>Website:</strong> <a href="${point.tags.website}" target="_blank" class="text-blue-600 hover:underline">Visit</a></p>` : ''}
          ${point.tags?.cuisine ? `<p><strong>Cuisine:</strong> ${point.tags.cuisine}</p>` : ''}
          ${point.tags?.drinking_water ? `<p><strong>Drinking Water:</strong> ${point.tags.drinking_water}</p>` : ''}
          ${point.tags?.access ? `<p><strong>Access:</strong> ${point.tags.access}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <a href="${googleMapsUrl}" target="_blank" 
             class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
            Open in Google Maps
          </a>
          <a href="${directionsUrl}" target="_blank" 
             class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors">
            Get Directions
          </a>
        </div>
      </div>
    `;
  };

  // Update all points (both location points and water points) with unified HTML markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Combine all points into one array
    const allPoints: (LocationPoint | WaterPoint)[] = [...locationPoints, ...waterPoints];

    if (allPoints.length === 0) return;

    // Create HTML markers for each point
    allPoints.forEach(point => {
      const el = createMarkerElement(point);
      
      const marker = new maplibregl.Marker(el)
        .setLngLat([point.lon, point.lat])
        .addTo(map.current!);

      // Add click handler for marker
      el.addEventListener('click', () => {
        // Handle selection based on point type
        if ('category' in point && point.category === 'water' && onWaterPointSelect) {
          onWaterPointSelect(point as WaterPoint);
        } else if (onLocationPointSelect) {
          onLocationPointSelect(point as LocationPoint);
        }

        // Create and show popup
        new maplibregl.Popup({ offset: 25 })
          .setLngLat([point.lon, point.lat])
          .setHTML(createPopupContent(point))
          .addTo(map.current!);
      });

      markersRef.current.push(marker);
    });

  }, [locationPoints, waterPoints, onLocationPointSelect, onWaterPointSelect]);

  // Center map on selected location point
  useEffect(() => {
    if (!map.current || !selectedLocationPoint) return;

    // Center map on selected location point
    map.current.flyTo({
      center: [selectedLocationPoint.lon, selectedLocationPoint.lat],
      zoom: Math.max(map.current.getZoom(), 15),
      duration: 1000
    });

  }, [selectedLocationPoint]);

  // Update current position marker
  useEffect(() => {
    if (!map.current || !currentPosition) return;

    // Add or update current position marker
    if (map.current.getSource('current-position')) {
      (map.current.getSource('current-position') as maplibregl.GeoJSONSource).setData({
        type: 'Point',
        coordinates: [currentPosition.lon, currentPosition.lat]
      });
    } else {
      map.current.addSource('current-position', {
        type: 'geojson',
        data: {
          type: 'Point',
          coordinates: [currentPosition.lon, currentPosition.lat]
        }
      });

      map.current.addLayer({
        id: 'current-position',
        type: 'circle',
        source: 'current-position',
        paint: {
          'circle-radius': 12,
          'circle-color': '#22C55E',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Add a pulsing animation
      map.current.addLayer({
        id: 'current-position-pulse',
        type: 'circle',
        source: 'current-position',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 20,
            20, 40
          ],
          'circle-color': '#22C55E',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'time'],
            0, 0.8,
            1000, 0
          ]
        }
      });
    }
  }, [currentPosition]);

  // Center map on selected water point
  useEffect(() => {
    if (!map.current || !selectedWaterPoint) return;

    // Center map on selected water point
    map.current.flyTo({
      center: [selectedWaterPoint.lon, selectedWaterPoint.lat],
      zoom: Math.max(map.current.getZoom(), 15),
      duration: 1000
    });

  }, [selectedWaterPoint]);

  return (
    <div 
      ref={mapContainer} 
      className={`w-full ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
});

MapView.displayName = 'MapView';
