import type { DetectionResult, DetectionParams, ProcessingStage } from './types';
import { DEFAULT_PARAMS } from './types';
import {
  toGrayscale,
  gaussianBlur,
  sobelEdgeDetect,
  nonMaxSuppression,
  doubleThreshold,
  getEdgePoints,
} from './imageProcessing';
import {
  buildHoughSpace,
  findHoughPeaks,
  linesToSegments,
  mergeCollinearSegments,
} from './houghTransform';
import { buildRoadGraph } from './roadGraph';

export async function detectRoads(
  imageData: ImageData,
  params: DetectionParams,
  onStage?: (stage: ProcessingStage) => void
): Promise<DetectionResult> {
  const startTime = performance.now();
  const p = { ...DEFAULT_PARAMS, ...params };

  await delay(10);
  onStage?.('grayscale');
  const gray = toGrayscale(imageData);
  const { width, height } = gray;

  await delay(10);
  onStage?.('noise-reduction');
  const blurred = gaussianBlur(gray.data, width, height, p.blurRadius);

  await delay(10);
  onStage?.('edge-detection');
  const edges = sobelEdgeDetect(blurred, width, height);
  const suppressed = nonMaxSuppression(
    edges.magnitude,
    edges.direction,
    width,
    height,
    p.edgeThreshold
  );
  const binary = doubleThreshold(suppressed, width, height);

  // Generate edge preview canvas
  const edgeCanvasUrl = createEdgePreview(binary, width, height);

  await delay(10);
  onStage?.('hough-transform');
  const edgePoints = getEdgePoints(binary, width, height);
  const hough = buildHoughSpace(edgePoints, width, height, 180);

  let maxVotes = 0;
  for (let i = 0; i < hough.accumulator.length; i++) {
    if (hough.accumulator[i] > maxVotes) maxVotes = hough.accumulator[i];
  }
  const threshold = Math.max(maxVotes * p.houghThreshold, 10);
  const peaks = findHoughPeaks(hough, threshold, 13);

  await delay(10);
  onStage?.('segment-merging');
  const rawSegments = linesToSegments(
    edgePoints,
    width,
    height,
    peaks,
    p.minSegmentLength,
    p.gapThreshold
  );
  const segments = mergeCollinearSegments(
    rawSegments,
    p.mergeAngleTolerance,
    p.mergeDistanceTolerance
  );

  await delay(10);
  onStage?.('graph-building');
  const graph = buildRoadGraph(segments, p.intersectionThreshold);

  onStage?.('complete');

  return {
    segments,
    graph,
    imageWidth: width,
    imageHeight: height,
    processingTime: performance.now() - startTime,
    edgeCanvasUrl,
  };
}

function createEdgePreview(
  binary: Uint8Array,
  width: number,
  height: number
): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imgData = ctx.createImageData(width, height);
    for (let i = 0; i < binary.length; i++) {
      const v = binary[i];
      imgData.data[i * 4] = v;
      imgData.data[i * 4 + 1] = v;
      imgData.data[i * 4 + 2] = v;
      imgData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
