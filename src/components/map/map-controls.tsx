import maplibregl from 'maplibre-gl';
import { toast } from 'sonner';
import { GPXData, WaterPoint, CurrentPosition } from '@/types';
import { parseGPX } from '@/utils/gpx-parser';
import { findWaterPoints } from '@/utils/overpass-api';

interface MapControlsProps {
  map: maplibregl.Map | null;
  onGpxLoad: (data: GPXData | null) => void;
  onWaterPointsLoad: (points: WaterPoint[]) => void;
  onCurrentPositionChange: (position: CurrentPosition | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onSettingsToggle: () => void;
  bufferDistance: number;
  isLoading: boolean;
}

// Upload Control
export class UploadControl implements maplibregl.IControl {
  private container: HTMLDivElement;
  private fileInput: HTMLInputElement;
  private props: MapControlsProps;

  constructor(props: MapControlsProps) {
    this.props = props;
    this.container = document.createElement('div');
    this.fileInput = document.createElement('input');
  }

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    
    const button = document.createElement('button');
    button.className = 'maplibregl-ctrl-icon';
    button.type = 'button';
    button.title = 'Upload GPX Route';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `;

    // Setup file input
    this.fileInput.type = 'file';
    this.fileInput.accept = '.gpx';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

    button.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.container.appendChild(button);
    this.container.appendChild(this.fileInput);

    return this.container;
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container);
  }

  private async handleFileSelect(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      toast.error('Please upload a valid GPX file');
      return;
    }

    this.props.onLoadingChange(true);
    
    try {
      const text = await file.text();
      const gpxData = parseGPX(text);
      
      if (!gpxData || gpxData.coordinates.length === 0) {
        toast.error('Invalid GPX file or no track data found');
        return;
      }

      this.props.onGpxLoad(gpxData);
      toast.success(`Route loaded: ${gpxData.coordinates.length} points`);

      // Find water points along the route
      const waterPoints = await findWaterPoints(gpxData, this.props.bufferDistance);
      this.props.onWaterPointsLoad(waterPoints);
      
      toast.success(`Found ${waterPoints.length} water points along the route`);
    } catch (error) {
      console.error('Error processing GPX file:', error);
      toast.error('Failed to process GPX file');
    } finally {
      this.props.onLoadingChange(false);
    }
  }
}

// Navigation Controls
export class NavigationControl implements maplibregl.IControl {
  private container!: HTMLDivElement;

  onAdd(map: maplibregl.Map): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    // Zoom In
    const zoomInButton = document.createElement('button');
    zoomInButton.className = 'maplibregl-ctrl-icon maplibregl-ctrl-zoom-in';
    zoomInButton.type = 'button';
    zoomInButton.title = 'Zoom in';
    zoomInButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    `;
    zoomInButton.addEventListener('click', () => map.zoomIn());

    // Zoom Out
    const zoomOutButton = document.createElement('button');
    zoomOutButton.className = 'maplibregl-ctrl-icon maplibregl-ctrl-zoom-out';
    zoomOutButton.type = 'button';
    zoomOutButton.title = 'Zoom out';
    zoomOutButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    `;
    zoomOutButton.addEventListener('click', () => map.zoomOut());

    this.container.appendChild(zoomInButton);
    this.container.appendChild(zoomOutButton);

    return this.container;
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container);
  }
}

// Locate Control
export class LocateControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private map: maplibregl.Map | null = null;

  constructor() {
    // No props needed for this control
  }

  onAdd(map: maplibregl.Map): HTMLElement {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    
    const button = document.createElement('button');
    button.className = 'maplibregl-ctrl-icon';
    button.type = 'button';
    button.title = 'Locate me';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    `;

    button.addEventListener('click', this.handleLocate.bind(this));

    this.container.appendChild(button);
    return this.container;
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container);
  }

  private handleLocate(): void {
    if (!navigator.geolocation || !this.map) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        toast.success(`Located at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        this.map?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 2000
        });

        // Add or update user location marker
        if (this.map?.getSource('user-location')) {
          (this.map.getSource('user-location') as maplibregl.GeoJSONSource).setData({
            type: 'Point',
            coordinates: [longitude, latitude]
          });
        } else {
          this.map?.addSource('user-location', {
            type: 'geojson',
            data: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          });

          this.map?.addLayer({
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
      () => {
        toast.error('Unable to retrieve your location');
      }
    );
  }
}

// Clear Control
export class ClearControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private props: MapControlsProps;

  constructor(props: MapControlsProps) {
    this.props = props;
  }

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    
    const button = document.createElement('button');
    button.className = 'maplibregl-ctrl-icon';
    button.type = 'button';
    button.title = 'Clear route';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19,6v14a2,2 0,0,1-2,2H7a2,2 0,0,1-2-2V6m3,0V4a2,2 0,0,1,2-2h4a2,2 0,0,1,2,2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
    `;

    button.addEventListener('click', () => {
      if (confirm('Clear route and all water points?')) {
        this.props.onGpxLoad(null);
        this.props.onWaterPointsLoad([]);
        this.props.onCurrentPositionChange(null);
        toast.success('Route cleared');
      }
    });

    this.container.appendChild(button);
    return this.container;
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container);
  }
}

// Settings Control
export class SettingsControl implements maplibregl.IControl {
  private container!: HTMLDivElement;
  private props: MapControlsProps;

  constructor(props: MapControlsProps) {
    this.props = props;
  }

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    
    const button = document.createElement('button');
    button.className = 'maplibregl-ctrl-icon';
    button.type = 'button';
    button.title = 'Settings';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    `;

    button.addEventListener('click', () => {
      this.props.onSettingsToggle();
    });

    this.container.appendChild(button);
    return this.container;
  }

  onRemove(): void {
    this.container.parentNode?.removeChild(this.container);
  }
}
