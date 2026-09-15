export interface Point {
  x: number;
  y: number;
}

export interface RoadSegment {
  id: string;
  start: Point;
  end: Point;
  width: number;
  angle: number;
  length: number;
  type: 'highway' | 'major' | 'minor' | 'path';
}

export interface RoadNode {
  id: string;
  point: Point;
  connections: string[];
  isIntersection: boolean;
}

export interface RoadEdge {
  id: string;
  from: string;
  to: string;
  segmentId: string;
  weight: number;
  distance: number;
  type: RoadSegment['type'];
}

export interface RoadGraph {
  nodes: Map<string, RoadNode>;
  edges: Map<string, RoadEdge>;
  segments: RoadSegment[];
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  direction: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'uturn' | 'arrive';
  fromPoint: Point;
  toPoint: Point;
  roadType: RoadSegment['type'];
}

export interface NavigationRoute {
  steps: NavigationStep[];
  totalDistance: number;
  path: Point[];
  estimatedTime: number;
}

export interface DetectionResult {
  segments: RoadSegment[];
  graph: RoadGraph;
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
  edgeCanvasUrl: string | null;
}

export type ProcessingStage =
  | 'idle'
  | 'loading'
  | 'grayscale'
  | 'noise-reduction'
  | 'edge-detection'
  | 'hough-transform'
  | 'segment-merging'
  | 'graph-building'
  | 'complete';

export interface DetectionParams {
  blurRadius: number;
  edgeThreshold: number;
  houghThreshold: number;
  minSegmentLength: number;
  gapThreshold: number;
  mergeAngleTolerance: number;
  mergeDistanceTolerance: number;
  intersectionThreshold: number;
}

export const DEFAULT_PARAMS: DetectionParams = {
  blurRadius: 1,
  edgeThreshold: 20,
  houghThreshold: 0.25,
  minSegmentLength: 15,
  gapThreshold: 12,
  mergeAngleTolerance: 0.15,
  mergeDistanceTolerance: 18,
  intersectionThreshold: 12,
};
