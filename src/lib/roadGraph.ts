import type { Point, RoadSegment, RoadGraph, RoadNode, RoadEdge } from './types';

const MIN_SEGMENT_LENGTH = 15;

export function buildRoadGraph(
  segments: RoadSegment[],
  intersectionThreshold = 12
): RoadGraph {
  const nodes = new Map<string, RoadNode>();
  const edges = new Map<string, RoadEdge>();
  const nodeKey = (x: number, y: number) =>
    `${Math.round(x)},${Math.round(y)}`;

  function getOrCreateNode(point: Point): RoadNode {
    // Snap to nearby existing node
    for (const [key, node] of nodes) {
      if (
        Math.abs(node.point.x - point.x) < intersectionThreshold &&
        Math.abs(node.point.y - point.y) < intersectionThreshold
      ) {
        return node;
      }
    }
    const key = nodeKey(point.x, point.y) + `-${nodes.size}`;
    const node: RoadNode = {
      id: key,
      point: { x: point.x, y: point.y },
      connections: [],
      isIntersection: false,
    };
    nodes.set(key, node);
    return node;
  }

  function connect(a: RoadNode, b: RoadNode, seg: RoadSegment) {
    if (a.id === b.id) return;
    if (!a.connections.includes(b.id)) a.connections.push(b.id);
    if (!b.connections.includes(a.id)) b.connections.push(a.id);
    const dist = pointDist(a.point, b.point);
    const edgeId = `${a.id}|${b.id}`;
    if (!edges.has(edgeId) && !edges.has(`${b.id}|${a.id}`)) {
      edges.set(edgeId, {
        id: edgeId,
        from: a.id,
        to: b.id,
        segmentId: seg.id,
        weight: dist / getSpeedFactor(seg.type),
        distance: dist,
        type: seg.type,
      });
    }
  }

  // Build nodes from segment endpoints
  for (const seg of segments) {
    if (seg.length < MIN_SEGMENT_LENGTH) continue;
    const startNode = getOrCreateNode(seg.start);
    const endNode = getOrCreateNode(seg.end);
    connect(startNode, endNode, seg);
  }

  // Find intersections: nodes near where two non-collinear segments cross
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const intersection = segmentIntersection(
        segments[i].start,
        segments[i].end,
        segments[j].start,
        segments[j].end
      );
      if (intersection) {
        const node = getOrCreateNode(intersection);
        node.isIntersection = true;
        // Split both segments at this intersection by connecting the intersection node
        // to each segment's endpoints
        const segA = segments[i];
        const segB = segments[j];
        const aStart = getOrCreateNode(segA.start);
        const aEnd = getOrCreateNode(segA.end);
        const bStart = getOrCreateNode(segB.start);
        const bEnd = getOrCreateNode(segB.end);
        connect(aStart, node, segA);
        connect(node, aEnd, segA);
        connect(bStart, node, segB);
        connect(node, bEnd, segB);
      }
    }
  }

  // Mark intersections
  for (const node of nodes.values()) {
    if (node.connections.length >= 3) {
      node.isIntersection = true;
    }
  }

  return { nodes, edges, segments };
}

export function segmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

function pointDist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getSpeedFactor(type: RoadSegment['type']): number {
  switch (type) {
    case 'highway':
      return 3;
    case 'major':
      return 2;
    case 'minor':
      return 1.2;
    case 'path':
      return 0.8;
  }
}
