import type { RoadGraph, RoadSegment, Point, NavigationRoute } from './types';

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString' | 'Point';
    coordinates: [number, number][];
  };
  properties: Record<string, unknown>;
}

export function segmentsToGeoJSON(segments: RoadSegment[]): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = segments.map((seg) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [seg.start.x, seg.start.y],
        [seg.end.x, seg.end.y],
      ],
    },
    properties: {
      id: seg.id,
      type: seg.type,
      width: seg.width,
      length: Math.round(seg.length),
    },
  }));

  return { type: 'FeatureCollection', features };
}

export function graphToGeoJSON(graph: RoadGraph): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];

  // Nodes as points
  for (const node of graph.nodes.values()) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [[node.point.x, node.point.y]],
      },
      properties: {
        id: node.id,
        intersection: node.isIntersection,
        connections: node.connections.length,
      },
    });
  }

  // Edges as lines
  for (const edge of graph.edges.values()) {
    const from = graph.nodes.get(edge.from);
    const to = graph.nodes.get(edge.to);
    if (!from || !to) continue;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.point.x, from.point.y],
          [to.point.x, to.point.y],
        ],
      },
      properties: {
        id: edge.id,
        type: edge.type,
        distance: Math.round(edge.distance),
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function routeToGeoJSON(route: NavigationRoute): GeoJsonFeatureCollection {
  const coordinates = route.path.map((p) => [p.x, p.y] as [number, number]);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          totalDistance: Math.round(route.totalDistance),
          estimatedTime: Math.round(route.estimatedTime),
          steps: route.steps.length,
        },
      },
    ],
  };
}

export function downloadGeoJSON(data: GeoJsonFeatureCollection, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function pointToLeafletLatLng(point: Point): [number, number] {
  return [point.y, point.x];
}

export function buildCombinedGeoJSON(
  segments: RoadSegment[],
  graph: RoadGraph,
  route: NavigationRoute | null
): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];

  // Roads
  for (const seg of segments) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [seg.start.x, seg.start.y],
          [seg.end.x, seg.end.y],
        ],
      },
      properties: {
        category: 'road',
        id: seg.id,
        type: seg.type,
        width: seg.width,
        length: Math.round(seg.length),
      },
    });
  }

  // Graph nodes
  for (const node of graph.nodes.values()) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [[node.point.x, node.point.y]],
      },
      properties: {
        category: 'node',
        id: node.id,
        intersection: node.isIntersection,
        connections: node.connections.length,
      },
    });
  }

  // Graph edges
  for (const edge of graph.edges.values()) {
    const from = graph.nodes.get(edge.from);
    const to = graph.nodes.get(edge.to);
    if (!from || !to) continue;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.point.x, from.point.y],
          [to.point.x, to.point.y],
        ],
      },
      properties: {
        category: 'edge',
        id: edge.id,
        type: edge.type,
        distance: Math.round(edge.distance),
      },
    });
  }

  // Route
  if (route) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.path.map((p) => [p.x, p.y] as [number, number]),
      },
      properties: {
        category: 'route',
        totalDistance: Math.round(route.totalDistance),
        estimatedTime: Math.round(route.estimatedTime),
        steps: route.steps.length,
      },
    });

    // Route steps as points
    for (let i = 0; i < route.steps.length; i++) {
      const step = route.steps[i];
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [[step.fromPoint.x, step.fromPoint.y]],
        },
        properties: {
          category: 'route-step',
          step: i + 1,
          instruction: step.instruction,
          direction: step.direction,
          distance: Math.round(step.distance),
          roadType: step.roadType,
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}
