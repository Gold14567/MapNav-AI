import type { Point, RoadSegment } from './types';

export interface HoughAccumulator {
  rhoBins: number;
  thetaBins: number;
  accumulator: Int32Array;
  maxRho: number;
}

export function buildHoughSpace(
  edgePoints: Point[],
  width: number,
  height: number,
  thetaResolution = 180
): HoughAccumulator {
  const maxRho = Math.sqrt(width * width + height * height);
  const rhoBins = Math.ceil(maxRho * 2);
  const thetaBins = thetaResolution;
  const accumulator = new Int32Array(rhoBins * thetaBins);

  const thetaStep = Math.PI / thetaBins;

  for (const point of edgePoints) {
    for (let t = 0; t < thetaBins; t++) {
      const theta = t * thetaStep;
      const rho = point.x * Math.cos(theta) + point.y * Math.sin(theta);
      const rhoIdx = Math.round(rho + maxRho);
      if (rhoIdx >= 0 && rhoIdx < rhoBins) {
        accumulator[rhoIdx * thetaBins + t]++;
      }
    }
  }

  return { rhoBins, thetaBins, accumulator, maxRho };
}

export interface HoughPeak {
  rho: number;
  theta: number;
  votes: number;
}

export function findHoughPeaks(
  hough: HoughAccumulator,
  threshold: number,
  neighborhoodSize = 11
): HoughPeak[] {
  const { rhoBins, thetaBins, accumulator, maxRho } = hough;
  const peaks: HoughPeak[] = [];
  const half = Math.floor(neighborhoodSize / 2);

  for (let r = 0; r < rhoBins; r++) {
    for (let t = 0; t < thetaBins; t++) {
      const val = accumulator[r * thetaBins + t];
      if (val < threshold) continue;

      let isMax = true;
      for (let dr = -half; dr <= half && isMax; dr++) {
        for (let dt = -half; dt <= half; dt++) {
          const nr = r + dr;
          const nt = t + dt;
          if (nr < 0 || nr >= rhoBins || nt < 0 || nt >= thetaBins) continue;
          if (nr === r && nt === t) continue;
          if (accumulator[nr * thetaBins + nt] > val) {
            isMax = false;
            break;
          }
        }
      }

      if (isMax) {
        peaks.push({
          rho: r - maxRho,
          theta: t * (Math.PI / thetaBins),
          votes: val,
        });
      }
    }
  }

  peaks.sort((a, b) => b.votes - a.votes);
  return peaks;
}

export function houghPeakToLine(
  peak: HoughPeak,
  width: number,
  height: number
): { start: Point; end: Point; angle: number } {
  const { rho, theta } = peak;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  let start: Point;
  let end: Point;

  if (Math.abs(sin) < 0.001) {
    start = { x: rho, y: 0 };
    end = { x: rho, y: height };
  } else if (Math.abs(cos) < 0.001) {
    start = { x: 0, y: rho };
    end = { x: width, y: rho };
  } else {
    // Intersect with image borders
    const points: Point[] = [];
    // y = 0
    const x0 = rho / cos;
    if (x0 >= 0 && x0 <= width) points.push({ x: x0, y: 0 });
    // y = height
    const xH = (rho - height * sin) / cos;
    if (xH >= 0 && xH <= width) points.push({ x: xH, y: height });
    // x = 0
    const y0 = rho / sin;
    if (y0 >= 0 && y0 <= height) points.push({ x: 0, y: y0 });
    // x = width
    const yW = (rho - width * cos) / sin;
    if (yW >= 0 && yW <= height) points.push({ x: width, y: yW });

    if (points.length >= 2) {
      start = points[0];
      end = points[1];
    } else {
      start = { x: 0, y: 0 };
      end = { x: width, y: height };
    }
  }

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  return { start, end, angle };
}

export function linesToSegments(
  edgePoints: Point[],
  width: number,
  height: number,
  peaks: HoughPeak[],
  minSegmentLength = 20,
  gapThreshold = 15
): RoadSegment[] {
  const segments: RoadSegment[] = [];

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const line = houghPeakToLine(peak, width, height);
    const segs = extractSegmentFromLine(
      edgePoints,
      line,
      width,
      height,
      minSegmentLength,
      gapThreshold
    );

    for (const seg of segs) {
      const length = Math.sqrt(
        (seg.end.x - seg.start.x) ** 2 + (seg.end.y - seg.start.y) ** 2
      );
      if (length >= minSegmentLength) {
        const type = classifyRoadType(peak.votes, length);
        segments.push({
          id: `seg-${i}-${segments.length}`,
          start: seg.start,
          end: seg.end,
          width: estimateRoadWidth(peak.votes),
          angle: seg.angle,
          length,
          type,
        });
      }
    }
  }

  return segments;
}

function extractSegmentFromLine(
  edgePoints: Point[],
  line: { start: Point; end: Point; angle: number },
  width: number,
  height: number,
  minLength: number,
  gapThreshold: number
): { start: Point; end: Point; angle: number }[] {
  // Project edge points onto the line, find continuous runs
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lineLen = Math.sqrt(dx * dx + dy * dy);
  if (lineLen < 1) return [];

  const ux = dx / lineLen;
  const uy = dy / lineLen;
  const nx = -uy;
  const ny = ux;

  // Build a distance threshold for point-to-line
  const distThreshold = 4;

  // Project points onto the line parameterized by t (0..lineLen)
  const projections: { t: number; dist: number }[] = [];
  for (const pt of edgePoints) {
    const t = (pt.x - line.start.x) * ux + (pt.y - line.start.y) * uy;
    if (t < 0 || t > lineLen) continue;
    const dist = Math.abs(
      (pt.x - line.start.x) * nx + (pt.y - line.start.y) * ny
    );
    if (dist <= distThreshold) {
      projections.push({ t, dist });
    }
  }

  projections.sort((a, b) => a.t - b.t);

  if (projections.length === 0) return [];

  // Find continuous runs (gap bridging)
  const results: { start: Point; end: Point; angle: number }[] = [];
  let runStart = projections[0].t;
  let lastT = projections[0].t;

  for (let i = 1; i < projections.length; i++) {
    if (projections[i].t - lastT > gapThreshold) {
      const runLen = lastT - runStart;
      if (runLen >= minLength) {
        results.push({
          start: {
            x: line.start.x + ux * runStart,
            y: line.start.y + uy * runStart,
          },
          end: {
            x: line.start.x + ux * lastT,
            y: line.start.y + uy * lastT,
          },
          angle: line.angle,
        });
      }
      runStart = projections[i].t;
    }
    lastT = projections[i].t;
  }

  const finalLen = lastT - runStart;
  if (finalLen >= minLength) {
    results.push({
      start: {
        x: line.start.x + ux * runStart,
        y: line.start.y + uy * runStart,
      },
      end: {
        x: line.start.x + ux * lastT,
        y: line.start.y + uy * lastT,
      },
      angle: line.angle,
    });
  }

  return results;
}

function classifyRoadType(
  votes: number,
  length: number
): RoadSegment['type'] {
  if (votes > 150 && length > 200) return 'highway';
  if (votes > 80 && length > 100) return 'major';
  if (votes > 30) return 'minor';
  return 'path';
}

function estimateRoadWidth(votes: number): number {
  return Math.min(Math.max(Math.round(votes / 20), 2), 12);
}

export function mergeCollinearSegments(
  segments: RoadSegment[],
  angleTolerance = 0.15,
  distanceTolerance = 15
): RoadSegment[] {
  const merged: RoadSegment[] = [];
  const used = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    if (used.has(segments[i].id)) continue;
    let current = segments[i];
    used.add(current.id);

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < segments.length; j++) {
        if (used.has(segments[j].id)) continue;
        const other = segments[j];

        // Check if collinear and close
        const angleDiff = Math.abs(normalizeAngle(current.angle - other.angle));
        if (angleDiff > angleTolerance && Math.abs(angleDiff - Math.PI) > angleTolerance)
          continue;

        // Check endpoints proximity
        const d1 = dist(current.end, other.start);
        const d2 = dist(current.end, other.end);
        const d3 = dist(current.start, other.start);
        const d4 = dist(current.start, other.end);

        if (d1 < distanceTolerance) {
          current = { ...current, end: other.end };
          used.add(other.id);
          changed = true;
        } else if (d2 < distanceTolerance) {
          current = { ...current, end: other.start };
          used.add(other.id);
          changed = true;
        } else if (d3 < distanceTolerance) {
          current = { ...current, start: other.end };
          used.add(other.id);
          changed = true;
        } else if (d4 < distanceTolerance) {
          current = { ...current, start: other.start };
          used.add(other.id);
          changed = true;
        }
      }
    }

    // Recalculate length
    current.length = Math.sqrt(
      (current.end.x - current.start.x) ** 2 +
      (current.end.y - current.start.y) ** 2
    );
    merged.push(current);
  }

  return merged;
}

function normalizeAngle(a: number): number {
  while (a < 0) a += Math.PI;
  while (a >= Math.PI) a -= Math.PI;
  return a;
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
