import { useCallback, useRef, useState } from 'react';
import {
  Compass,
  Github,
  Sparkles,
  ScanLine,
  Network,
  Route,
} from 'lucide-react';
import { AIProviderPanel } from '@/components/AIProviderPanel';
import { ImageUploader } from '@/components/ImageUploader';
import { MapView } from '@/components/MapView';
import { NavigationPanel } from '@/components/NavigationPanel';
import { ProcessingOverlay } from '@/components/ProcessingOverlay';
import { RoadStats } from '@/components/RoadStats';
import { SettingsPanel } from '@/components/SettingsPanel';
import { detectRoads } from '@/lib/detection';
import { findNearestNode, aStarPathfinding, buildNavigationRoute } from '@/lib/navigation';
import type {
  DetectionResult,
  DetectionMode,
  DetectionParams,
  NavigationRoute,
  Point,
  ProcessingStage,
} from '@/lib/types';
import { DEFAULT_PARAMS, DETECTION_PRESETS } from '@/lib/types';

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [selectingMode, setSelectingMode] = useState<'start' | 'end' | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('balanced');
  const [params, setParams] = useState<DetectionParams>(DEFAULT_PARAMS);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isProcessing =
    processingStage !== 'idle' && processingStage !== 'complete';

  const handleDetectionModeChange = useCallback((mode: DetectionMode) => {
    setDetectionMode(mode);
    if (mode !== 'custom') {
      setParams({ ...DETECTION_PRESETS[mode] });
    }
  }, []);

  const runDetection = useCallback(
    async (data: ImageData) => {
      const result = await detectRoads(data, params, setProcessingStage);
      setDetection(result);
      setTimeout(() => setProcessingStage('idle'), 800);
    },
    [params]
  );

  const handleImageUpload = useCallback(
    async (file: File, url: string) => {
      setImageUrl(url);
      setDetection(null);
      setRoute(null);
      setStartPoint(null);
      setEndPoint(null);
      setProcessingStage('loading');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
        setImageData(data);
        await runDetection(data);
      };
      img.src = url;
    },
    [runDetection]
  );

  const handleReprocess = useCallback(async () => {
    if (!imageData) return;
    setDetection(null);
    setRoute(null);
    setStartPoint(null);
    setEndPoint(null);
    setProcessingStage('loading');
    await runDetection(imageData);
  }, [imageData, runDetection]);

  const handleClear = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setImageData(null);
    setDetection(null);
    setRoute(null);
    setStartPoint(null);
    setEndPoint(null);
    setProcessingStage('idle');
  }, [imageUrl]);

  const handleMapClick = useCallback(
    (point: Point) => {
      if (selectingMode === 'start') {
        setStartPoint(point);
        setSelectingMode(null);
        setRoute(null);
      } else if (selectingMode === 'end') {
        setEndPoint(point);
        setSelectingMode(null);
        setRoute(null);
      }
    },
    [selectingMode]
  );

  const handleCalculateRoute = useCallback(() => {
    if (!detection || !startPoint || !endPoint) return;
    setIsCalculating(true);

    setTimeout(() => {
      const startNode = findNearestNode(detection.graph, startPoint);
      const endNode = findNearestNode(detection.graph, endPoint);

      if (!startNode || !endNode) {
        setIsCalculating(false);
        return;
      }

      const path = aStarPathfinding(detection.graph, startNode.id, endNode.id);
      if (!path) {
        setIsCalculating(false);
        return;
      }

      const navRoute = buildNavigationRoute(detection.graph, path);
      setRoute(navRoute);
      setIsCalculating(false);
    }, 100);
  }, [detection, startPoint, endPoint]);

  const intersectionCount = detection
    ? Array.from(detection.graph.nodes.values()).filter(
        (n) => n.isIntersection
      ).length
    : 0;

  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="z-10 flex items-center justify-between border-b border-ink-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-road-500">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-white">
              MapNav AI
            </h1>
            <p className="text-xs text-ink-500">Road Detection & Navigation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Gold14567/MapNav-AI"
            target="_blank"
            rel="noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-ink-300 transition-all hover:border-ink-500 hover:text-white"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* Main content */}
      {!imageUrl ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/50 px-4 py-1.5 text-xs font-medium text-ink-300">
                <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                AI-powered road detection from map images
              </div>
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                Upload a map. Get navigation data.
              </h2>
              <p className="mt-3 text-base text-ink-400">
                Our computer vision pipeline detects roads from any map image,
                builds a routable graph, and generates turn-by-turn navigation
                — all in your browser. No GPS, no external maps needed.
              </p>
            </div>
            <ImageUploader
              onImageUpload={handleImageUpload}
              hasImage={false}
              onClear={handleClear}
            />
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FeatureCard
                icon="scan"
                title="Edge Detection"
                desc="Canny edge detection isolates road lines from the map."
              />
              <FeatureCard
                icon="network"
                title="Hough Transform"
                desc="Probabilistic Hough transform extracts road segments."
              />
              <FeatureCard
                icon="route"
                title="A* Pathfinding"
                desc="Optimal routing with turn-by-turn directions."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Map area */}
          <div className="relative min-h-0 min-w-0">
            <MapView
              imageUrl={imageUrl}
              detection={detection}
              route={route}
              startPoint={startPoint}
              endPoint={endPoint}
              onMapClick={handleMapClick}
              selectingMode={selectingMode}
            />
            {detection && (
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-[500]">
                <div className="pointer-events-auto inline-block">
                  <RoadStats detection={detection} />
                </div>
              </div>
            )}
            {isProcessing && <ProcessingOverlay stage={processingStage} />}
          </div>

          {/* Side panel */}
          <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-ink-800 bg-ink-900/30">
            <div className="border-b border-ink-800 px-5 py-4">
              <ImageUploader
                onImageUpload={handleImageUpload}
                hasImage={true}
                onClear={handleClear}
              />
            </div>

            <AIProviderPanel imageUrl={imageUrl} />

            <SettingsPanel
              mode={detectionMode}
              params={params}
              onModeChange={handleDetectionModeChange}
              onChange={setParams}
              onReprocess={handleReprocess}
              hasImage={!!imageUrl}
              isProcessing={isProcessing}
            />

            {detection ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <NavigationPanel
                  route={route}
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onSelectStart={() => setSelectingMode('start')}
                  onSelectEnd={() => setSelectingMode('end')}
                  onCalculate={handleCalculateRoute}
                  isCalculating={isCalculating}
                  selectingMode={selectingMode}
                  roadCount={detection.segments.length}
                  intersectionCount={intersectionCount}
                />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
                <p className="text-sm text-ink-500">
                  {isProcessing
                    ? 'Detecting roads...'
                    : 'Waiting for detection to complete...'}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: 'scan' | 'network' | 'route';
  title: string;
  desc: string;
}) {
  const icons: Record<string, typeof Compass> = {
    scan: ScanLine,
    network: Network,
    route: Route,
  };
  const Icon = icons[icon] || Compass;

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-4 transition-all hover:border-ink-600">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800">
        <Icon className="h-4 w-4 text-accent-400" />
      </div>
      <h3 className="mb-1 font-display text-sm font-semibold text-white">
        {title}
      </h3>
      <p className="text-xs text-ink-400">{desc}</p>
    </div>
  );
}

export default App;
