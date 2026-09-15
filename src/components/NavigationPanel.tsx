import {
  Navigation,
  MapPin,
  Flag,
  Clock,
  Route as RouteIcon,
  Download,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  CornerDownRight,
  CornerDownLeft,
  CircleDot,
  Circle,
} from 'lucide-react';
import type { NavigationRoute, NavigationStep, Point } from '@/lib/types';
import { downloadGeoJSON, routeToGeoJSON } from '@/lib/geoJson';

interface NavigationPanelProps {
  route: NavigationRoute | null;
  startPoint: Point | null;
  endPoint: Point | null;
  onSelectStart: () => void;
  onSelectEnd: () => void;
  onCalculate: () => void;
  isCalculating: boolean;
  selectingMode: 'start' | 'end' | null;
  roadCount: number;
  intersectionCount: number;
}

export function NavigationPanel({
  route,
  startPoint,
  endPoint,
  onSelectStart,
  onSelectEnd,
  onCalculate,
  isCalculating,
  selectingMode,
  roadCount,
  intersectionCount,
}: NavigationPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-ink-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-accent-400" />
          <h2 className="font-display text-lg font-semibold text-white">
            Navigation
          </h2>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* Route setup */}
        <div className="space-y-3">
          <button
            onClick={onSelectStart}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
              selectingMode === 'start'
                ? 'border-accent-500 bg-accent-500/10'
                : 'border-ink-700 hover:border-ink-500'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20">
              <MapPin className="h-4 w-4 text-accent-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-ink-400">Start point</p>
              <p className="text-sm font-medium text-white">
                {startPoint
                  ? `${Math.round(startPoint.x)}, ${Math.round(startPoint.y)}`
                  : 'Click to set on map'}
              </p>
            </div>
          </button>

          <button
            onClick={onSelectEnd}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
              selectingMode === 'end'
                ? 'border-red-500 bg-red-500/10'
                : 'border-ink-700 hover:border-ink-500'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
              <Flag className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-ink-400">Destination</p>
              <p className="text-sm font-medium text-white">
                {endPoint
                  ? `${Math.round(endPoint.x)}, ${Math.round(endPoint.y)}`
                  : 'Click to set on map'}
              </p>
            </div>
          </button>

          <button
            onClick={onCalculate}
            disabled={!startPoint || !endPoint || isCalculating}
            className="btn-primary w-full"
          >
            {isCalculating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Calculating...
              </>
            ) : (
              <>
                <RouteIcon className="h-4 w-4" />
                Calculate Route
              </>
            )}
          </button>
        </div>

        {/* Route results */}
        {route && (
          <div className="mt-6 animate-slide-up">
            <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <RouteIcon className="mx-auto mb-1 h-4 w-4 text-accent-400" />
                  <p className="text-lg font-bold text-white">
                    {Math.round(route.totalDistance)}
                  </p>
                  <p className="text-xs text-ink-400">units</p>
                </div>
                <div>
                  <Clock className="mx-auto mb-1 h-4 w-4 text-road-400" />
                  <p className="text-lg font-bold text-white">
                    {formatTime(route.estimatedTime)}
                  </p>
                  <p className="text-xs text-ink-400">est. time</p>
                </div>
                <div>
                  <Navigation className="mx-auto mb-1 h-4 w-4 text-amber-400" />
                  <p className="text-lg font-bold text-white">
                    {route.steps.length}
                  </p>
                  <p className="text-xs text-ink-400">steps</p>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                downloadGeoJSON(routeToGeoJSON(route), 'navigation-route.geojson')
              }
              className="btn-ghost mt-3 w-full"
            >
              <Download className="h-4 w-4" />
              Export Route GeoJSON
            </button>

            {/* Turn-by-turn directions */}
            <div className="mt-4">
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-ink-400">
                Turn-by-turn directions
              </h3>
              <ol className="space-y-1">
                {route.steps.map((step, i) => (
                  <StepItem key={i} step={step} index={i} />
                ))}
              </ol>
            </div>
          </div>
        )}

        {!route && startPoint && endPoint && (
          <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900/50 p-4 text-center text-sm text-ink-400">
            Click "Calculate Route" to find the best path.
          </div>
        )}
      </div>
    </div>
  );
}

function StepItem({ step, index }: { step: NavigationStep; index: number }) {
  const icon = getDirectionIcon(step.direction);
  const colorClass = getDirectionColor(step.direction);

  return (
    <li className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-all hover:bg-ink-800/50">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{step.instruction}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
          <span>{Math.round(step.distance)} units</span>
          <span className="text-ink-600">·</span>
          <span className="capitalize">{step.roadType} road</span>
        </div>
      </div>
      <span className="text-xs font-medium text-ink-500">{index + 1}</span>
    </li>
  );
}

function getDirectionIcon(direction: NavigationStep['direction']) {
  const className = 'h-3.5 w-3.5';
  switch (direction) {
    case 'straight':
      return <ArrowUp className={className} />;
    case 'left':
      return <CornerDownLeft className={className} />;
    case 'right':
      return <CornerDownRight className={className} />;
    case 'slight-left':
      return <ArrowUpLeft className={className} />;
    case 'slight-right':
      return <ArrowUpRight className={className} />;
    case 'uturn':
      return <ArrowUp className={`${className} rotate-180`} />;
    case 'arrive':
      return <CircleDot className={className} />;
    default:
      return <ArrowRight className={className} />;
  }
}

function getDirectionColor(direction: NavigationStep['direction']) {
  switch (direction) {
    case 'left':
    case 'slight-left':
      return 'bg-amber-500/20 text-amber-400';
    case 'right':
    case 'slight-right':
      return 'bg-blue-500/20 text-blue-400';
    case 'arrive':
      return 'bg-accent-500/20 text-accent-400';
    case 'uturn':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-ink-700 text-ink-300';
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return `${min}m ${sec}s`;
}
