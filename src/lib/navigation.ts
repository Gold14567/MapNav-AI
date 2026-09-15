import type {
  Point,
  RoadGraph,
  RoadNode,
  NavigationRoute,
  NavigationStep,
} from './types';

export function findNearestNode(
  graph: RoadGraph,
  point: Point
): RoadNode | null {
  let nearest: RoadNode | null = null;
  let minDist = Infinity;

  for (const node of graph.nodes.values()) {
    const d = (node.point.x - point.x) ** 2 + (node.point.y - point.y) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = node;
    }
  }

  return nearest;
}

export function aStarPathfinding(
  graph: RoadGraph,
  startId: string,
  endId: string
): string[] | null {
  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(startId, 0);
  const startNode = graph.nodes.get(startId);
  const endNode = graph.nodes.get(endId);
  if (!startNode || !endNode) return null;

  fScore.set(startId, heuristic(startNode.point, endNode.point));

  while (openSet.size > 0) {
    // Find node with lowest fScore in openSet
    let current: string | null = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    }

    if (current === null) return null;
    if (current === endId) {
      return reconstructPath(cameFrom, current);
    }

    openSet.delete(current);
    const currentNode = graph.nodes.get(current)!;

    for (const neighborId of currentNode.connections) {
      const edge = findEdge(graph, current, neighborId);
      if (!edge) continue;

      const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight;
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentativeG);
        const neighborNode = graph.nodes.get(neighborId);
        if (!neighborNode) continue;
        fScore.set(neighborId, tentativeG + heuristic(neighborNode.point, endNode.point));
        openSet.add(neighborId);
      }
    }
  }

  return null;
}

function findEdge(graph: RoadGraph, from: string, to: string) {
  const e1 = graph.edges.get(`${from}|${to}`);
  if (e1) return e1;
  return graph.edges.get(`${to}|${from}`);
}

function reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    path.unshift(current);
  }
  return path;
}

function heuristic(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function buildNavigationRoute(
  graph: RoadGraph,
  nodePath: string[]
): NavigationRoute | null {
  if (nodePath.length < 2) return null;

  const points: Point[] = [];
  const steps: NavigationStep[] = [];
  let totalDistance = 0;

  for (let i = 0; i < nodePath.length; i++) {
    const node = graph.nodes.get(nodePath[i]);
    if (!node) return null;
    points.push(node.point);
  }

  for (let i = 0; i < nodePath.length - 1; i++) {
    const fromNode = graph.nodes.get(nodePath[i])!;
    const toNode = graph.nodes.get(nodePath[i + 1])!;
    const edge = findEdge(graph, nodePath[i], nodePath[i + 1]);
    if (!edge) continue;

    const dist = edge.distance;
    totalDistance += dist;

    let direction: NavigationStep['direction'] = 'straight';
    let instruction = '';

    if (i === 0) {
      instruction = 'Start heading toward the detected road';
      direction = 'straight';
    } else if (i === nodePath.length - 2) {
      instruction = 'Arrive at your destination';
      direction = 'arrive';
    } else {
      const prevNode = graph.nodes.get(nodePath[i - 1])!;
      const prevAngle = Math.atan2(
        fromNode.point.y - prevNode.point.y,
        fromNode.point.x - prevNode.point.x
      );
      const nextAngle = Math.atan2(
        toNode.point.y - fromNode.point.y,
        toNode.point.x - fromNode.point.x
      );
      const turnAngle = normalizeTurn(nextAngle - prevAngle);

      if (Math.abs(turnAngle) < 0.2) {
        direction = 'straight';
        instruction = 'Continue straight';
      } else if (turnAngle > 0.2 && turnAngle <= 0.7) {
        direction = 'slight-right';
        instruction = 'Slight right';
      } else if (turnAngle > 0.7) {
        direction = 'right';
        instruction = 'Turn right';
      } else if (turnAngle < -0.2 && turnAngle >= -0.7) {
        direction = 'slight-left';
        instruction = 'Slight left';
      } else if (turnAngle < -0.7) {
        direction = 'left';
        instruction = 'Turn left';
      } else {
        direction = 'uturn';
        instruction = 'Make a U-turn';
      }
    }

    steps.push({
      instruction,
      distance: dist,
      direction,
      fromPoint: fromNode.point,
      toPoint: toNode.point,
      roadType: edge.type,
    });
  }

  // Estimate time: assume ~50 px/s average speed
  const estimatedTime = totalDistance / 50;

  return { steps, totalDistance, path: points, estimatedTime };
}

function normalizeTurn(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
