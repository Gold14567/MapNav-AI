import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { DetectionResult, Point, NavigationRoute } from '@/lib/types';

interface MapViewProps {
  imageUrl: string;
  detection: DetectionResult | null;
  route: NavigationRoute | null;
  startPoint: Point | null;
  endPoint: Point | null;
  onMapClick: (point: Point) => void;
  selectingMode: 'start' | 'end' | null;
}

export function MapView({
  imageUrl,
  detection,
  route,
  startPoint,
  endPoint,
  onMapClick,
  selectingMode,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const roadLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const clickHandlerRef = useRef<((p: Point) => void) | null>(null);

  clickHandlerRef.current = onMapClick;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 3,
      zoomControl: true,
      attributionControl: false,
    });
    map.setView([0, 0], 0);
    mapRef.current = map;

    roadLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle map clicks
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      if (!clickHandlerRef.current) return;
      const { lat, lng } = e.latlng;
      clickHandlerRef.current({ x: lng, y: lat });
    };

    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, []);

  // Update image overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Remove old overlay
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
      }

      const bounds = L.latLngBounds([
        [0, 0],
        [h, w],
      ]);
      const overlay = L.imageOverlay(imageUrl, bounds, {
        opacity: 0.85,
      }).addTo(map);
      imageOverlayRef.current = overlay;

      map.fitBounds(bounds);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw roads
  useEffect(() => {
    const layer = roadLayerRef.current;
    if (!layer || !detection) return;

    layer.clearLayers();

    for (const seg of detection.segments) {
      const latlngs: L.LatLngExpression[] = [
        [seg.start.y, seg.start.x],
        [seg.end.y, seg.end.x],
      ];
      const color = getRoadColor(seg.type);
      const weight = getRoadWeight(seg.type);

      L.polyline(latlngs, {
        color,
        weight,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);
    }

    // Draw intersection nodes
    for (const node of detection.graph.nodes.values()) {
      if (node.isIntersection) {
        L.circleMarker([node.point.y, node.point.x], {
          radius: 3,
          fillColor: '#fbbf24',
          color: '#f59e0b',
          fillOpacity: 0.9,
          weight: 1,
        }).addTo(layer);
      }
    }
  }, [detection]);

  // Draw route
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (route) {
      const latlngs: L.LatLngExpression[] = route.path.map((p) => [
        p.y,
        p.x,
      ]);

      // Outer glow
      L.polyline(latlngs, {
        color: '#22a45e',
        weight: 10,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);

      // Main route line
      L.polyline(latlngs, {
        color: '#43bf78',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '12, 8',
      }).addTo(layer);
    }
  }, [route]);

  // Draw start/end markers
  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (startPoint) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#22a45e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:10px;font-weight:700;color:#fff;">A</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      L.marker([startPoint.y, startPoint.x], { icon }).addTo(layer);
    }

    if (endPoint) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:10px;font-weight:700;color:#fff;">B</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      L.marker([endPoint.y, endPoint.x], { icon }).addTo(layer);
    }
  }, [startPoint, endPoint]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {selectingMode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[1000] -translate-x-1/2">
          <div className="glass rounded-full border border-ink-700 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {selectingMode === 'start'
              ? 'Click on the map to set your starting point'
              : 'Click on the map to set your destination'}
          </div>
        </div>
      )}
    </div>
  );
}

function getRoadColor(type: string): string {
  switch (type) {
    case 'highway':
      return '#f59e0b';
    case 'major':
      return '#38bdf8';
    case 'minor':
      return '#8492a8';
    case 'path':
      return '#65728a';
    default:
      return '#8492a8';
  }
}

function getRoadWeight(type: string): number {
  switch (type) {
    case 'highway':
      return 6;
    case 'major':
      return 4;
    case 'minor':
      return 3;
    case 'path':
      return 2;
    default:
      return 3;
  }
}
