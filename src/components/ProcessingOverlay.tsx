import { Loader2, ScanLine, GitBranch, Network, CheckCircle2 } from 'lucide-react';
import type { ProcessingStage } from '@/lib/types';

interface ProcessingOverlayProps {
  stage: ProcessingStage;
}

const STAGE_LABELS: Record<string, string> = {
  loading: 'Loading image...',
  grayscale: 'Converting to grayscale...',
  'noise-reduction': 'Reducing noise...',
  'edge-detection': 'Detecting edges (Canny)...',
  'hough-transform': 'Running Hough transform...',
  'segment-merging': 'Merging road segments...',
  'graph-building': 'Building road graph...',
  complete: 'Detection complete!',
};

const STAGE_ICONS: Record<string, typeof ScanLine> = {
  loading: Loader2,
  grayscale: ScanLine,
  'noise-reduction': ScanLine,
  'edge-detection': ScanLine,
  'hough-transform:': Network,
  'segment-merging': GitBranch,
  'graph-building': GitBranch,
  complete: CheckCircle2,
};

export function ProcessingOverlay({ stage }: ProcessingOverlayProps) {
  const stages: ProcessingStage[] = [
    'grayscale',
    'noise-reduction',
    'edge-detection',
    'hough-transform',
    'segment-merging',
    'graph-building',
  ];

  const currentIndex = stages.indexOf(stage);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass w-full max-w-md rounded-2xl border border-ink-700 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-accent-400" />
          <h3 className="font-display text-lg font-semibold text-white">
            AI Road Detection
          </h3>
        </div>

        <div className="space-y-3">
          {stages.map((s, i) => {
            const isComplete = i < currentIndex;
            const isActive = i === currentIndex;
            const label = STAGE_LABELS[s] || s;
            const Icon = STAGE_ICONS[s] || Loader2;

            return (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    isComplete
                      ? 'bg-accent-500/20 text-accent-400'
                      : isActive
                        ? 'bg-road-500/20 text-road-400'
                        : 'bg-ink-800 text-ink-500'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm transition-all ${
                    isComplete
                      ? 'text-ink-400'
                      : isActive
                        ? 'font-medium text-white'
                        : 'text-ink-600'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 h-1 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-road-400 transition-all duration-500"
            style={{
              width: `${((currentIndex + 1) / stages.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
