import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapViewProps } from '@/types';
import { createRouteGeoJSON, createWaterPointsGeoJSON } from '@/utils/map-utils';

export interface MapViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  locateUser: () => void;
  getMap: () => maplibregl.Map | null;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>(({ 
  gpxData, 
  waterPoints, 
  currentPosition,
  selectedWaterPoint,
  onWaterPointSelect,
  className 
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

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
      style: 'https://api.maptiler.com/maps/outdoor-v2/style.json?key=r0T8W9TTH8XCCGoLL9gE',
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

  // Update water points when they change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing water points if they exist
    if (map.current.getSource('water-points')) {
      map.current.removeLayer('water-points');
      map.current.removeSource('water-points');
    }

    if (waterPoints.length === 0) return;

    const waterPointsGeoJSON = createWaterPointsGeoJSON(waterPoints);

    // Add water points source and layer
    map.current.addSource('water-points', {
      type: 'geojson',
      data: waterPointsGeoJSON
    });

    map.current.addLayer({
      id: 'water-points',
      type: 'circle',
      source: 'water-points',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'type'],
          'fountain', '#3B82F6',
          'well', '#10B981',
          'spring', '#059669',
          'tap', '#8B5CF6',
          '#6B7280'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });

    // Add click handlers for water points
    map.current.on('click', 'water-points', (e) => {
      if (!e.features || !e.features[0]) return;
      
      const feature = e.features[0];
      const properties = feature.properties;
      
      if (!properties) return;

      // Find the water point and select it
      const waterPoint = waterPoints.find(wp => wp.id === properties.id);
      if (waterPoint && onWaterPointSelect) {
        onWaterPointSelect(waterPoint);
      }

      new maplibregl.Popup()
        .setLngLat([properties.lon, properties.lat])
        .setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">${properties.name || `${properties.type} Point`}</h3>
            <p class="text-sm text-gray-600">Distance: ${(properties.distanceFromStart / 1000).toFixed(1)}km</p>
            ${properties.info ? `<p class="text-sm mt-1">${properties.info}</p>` : ''}
          </div>
        `)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'water-points', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'water-points', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });

  }, [waterPoints]);

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
