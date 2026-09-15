import type { Point } from './types';

export interface GrayscaleResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function toGrayscale(
  imageData: ImageData,
  maxDimension = 800
): GrayscaleResult {
  let { width, height, data } = imageData;

  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    const newW = Math.round(width * scale);
    const newH = Math.round(height * scale);
    data = resizeBilinear(data, width, height, newW, newH);
    width = newW;
    height = newH;
  }

  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return { data: gray, width, height };
}

function resizeBilinear(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = (srcW - 1) / dstW;
  const yRatio = (srcH - 1) / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = x * xRatio;
      const sy = y * yRatio;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const dx = sx - x0;
      const dy = sy - y0;

      for (let c = 0; c < 4; c++) {
        const v00 = src[(y0 * srcW + x0) * 4 + c];
        const v01 = src[(y0 * srcW + x1) * 4 + c];
        const v10 = src[(y1 * srcW + x0) * 4 + c];
        const v11 = src[(y1 * srcW + x1) * 4 + c];
        const top = v00 * (1 - dx) + v01 * dx;
        const bot = v10 * (1 - dx) + v11 * dx;
        dst[(y * dstW + x) * 4 + c] = Math.round(top * (1 - dy) + bot * dy);
      }
    }
  }
  return dst;
}

export function gaussianBlur(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  radius = 1
): Uint8ClampedArray {
  const kernel = buildGaussianKernel(radius);
  const result = new Uint8ClampedArray(gray.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          const w = kernel[(ky + radius) * (radius * 2 + 1) + (kx + radius)];
          sum += gray[py * width + px] * w;
          weightSum += w;
        }
      }
      result[y * width + x] = Math.round(sum / weightSum);
    }
  }
  return result;
}

function buildGaussianKernel(radius: number): number[] {
  const size = radius * 2 + 1;
  const sigma = radius / 2 || 0.5;
  const kernel: number[] = [];
  let sum = 0;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const v = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel.push(v);
      sum += v;
    }
  }
  return kernel.map((v) => v / sum);
}

export interface EdgeResult {
  magnitude: Float32Array;
  direction: Float32Array;
  width: number;
  height: number;
}

export function sobelEdgeDetect(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): EdgeResult {
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = gray[(y + ky) * width + (x + kx)];
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += px * gxK[ki];
          gy += px * gyK[ki];
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      magnitude[y * width + x] = mag;
      direction[y * width + x] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction, width, height };
}

export function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Float32Array,
  width: number,
  height: number,
  threshold = 20
): Float32Array {
  const result = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      if (mag < threshold) continue;

      const angle = direction[idx];
      const angleDeg = ((angle * 180) / Math.PI + 180) % 180;

      let n1 = 0;
      let n2 = 0;

      if (angleDeg < 22.5 || angleDeg >= 157.5) {
        n1 = magnitude[idx - 1];
        n2 = magnitude[idx + 1];
      } else if (angleDeg < 67.5) {
        n1 = magnitude[idx - width + 1];
        n2 = magnitude[idx + width - 1];
      } else if (angleDeg < 112.5) {
        n1 = magnitude[idx - width];
        n2 = magnitude[idx + width];
      } else {
        n1 = magnitude[idx - width - 1];
        n2 = magnitude[idx + width + 1];
      }

      if (mag >= n1 && mag >= n2) {
        result[idx] = mag;
      }
    }
  }

  return result;
}

export function doubleThreshold(
  edges: Float32Array,
  width: number,
  height: number,
  lowRatio = 0.3,
  highRatio = 0.15
): Uint8Array {
  const result = new Uint8Array(width * height);
  let max = 0;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > max) max = edges[i];
  }
  const high = max * (1 - highRatio);
  const low = high * lowRatio;

  for (let i = 0; i < edges.length; i++) {
    if (edges[i] >= high) result[i] = 255;
    else if (edges[i] >= low) result[i] = 128;
  }

  // Hysteresis: connect weak to strong
  const queue: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (result[idx] === 255) queue.push(idx);
    }
  }
  while (queue.length > 0) {
    const idx = queue.shift()!;
    const x = idx % width;
    const y = Math.floor(idx / width);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (result[nIdx] === 128) {
          result[nIdx] = 255;
          queue.push(nIdx);
        }
      }
    }
  }

  return result;
}

export function getEdgePoints(
  binary: Uint8Array,
  width: number,
  height: number
): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (binary[y * width + x] === 255) {
        points.push({ x, y });
      }
    }
  }
  return points;
}
