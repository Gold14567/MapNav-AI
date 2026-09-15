import { useState } from 'react';
import { Sliders, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import type { DetectionParams } from '@/lib/types';
import { DEFAULT_PARAMS } from '@/lib/types';

interface SettingsPanelProps {
  params: DetectionParams;
  onChange: (params: DetectionParams) => void;
  onReprocess: () => void;
  hasImage: boolean;
  isProcessing: boolean;
}

interface SliderConfig {
  key: keyof DetectionParams;
  label: string;
  min: number;
  max: number;
  step: number;
  hint: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'blurRadius',
    label: 'Blur Radius',
    min: 0,
    max: 5,
    step: 1,
    hint: 'Higher = smoother, less noise but may miss thin roads',
  },
  {
    key: 'edgeThreshold',
    label: 'Edge Sensitivity',
    min: 5,
    max: 80,
    step: 1,
    hint: 'Lower = detect more edges, higher = only strong edges',
  },
  {
    key: 'houghThreshold',
    label: 'Hough Threshold',
    min: 0.05,
    max: 0.6,
    step: 0.05,
    hint: 'Lower = detect more road lines, higher = only confident ones',
  },
  {
    key: 'minSegmentLength',
    label: 'Min Road Length',
    min: 5,
    max: 80,
    step: 1,
    hint: 'Shorter = detect short roads, longer = filter out noise',
  },
  {
    key: 'gapThreshold',
    label: 'Gap Bridging',
    min: 3,
    max: 40,
    step: 1,
    hint: 'Higher = bridge gaps in roads, may merge unrelated roads',
  },
  {
    key: 'mergeAngleTolerance',
    label: 'Merge Angle',
    min: 0.02,
    max: 0.5,
    step: 0.01,
    hint: 'How close angles must be to merge collinear roads',
  },
  {
    key: 'mergeDistanceTolerance',
    label: 'Merge Distance',
    min: 5,
    max: 50,
    step: 1,
    hint: 'How close endpoints must be to merge road segments',
  },
  {
    key: 'intersectionThreshold',
    label: 'Intersection Snap',
    min: 5,
    max: 40,
    step: 1,
    hint: 'How close nodes must be to count as the same intersection',
  },
];

export function SettingsPanel({
  params,
  onChange,
  onReprocess,
  hasImage,
  isProcessing,
}: SettingsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-ink-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-all hover:bg-ink-800/30"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-road-400" />
          <span className="text-sm font-semibold text-white">
            AI Detection Settings
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-400" />
        )}
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-4 px-5 pb-4">
          {SLIDERS.map((slider) => (
            <div key={slider.key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-ink-200">
                  {slider.label}
                </label>
                <span className="rounded-md bg-ink-800 px-2 py-0.5 text-xs font-mono text-accent-400">
                  {params[slider.key]}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={params[slider.key]}
                onChange={(e) =>
                  onChange({
                    ...params,
                    [slider.key]: parseFloat(e.target.value),
                  })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-accent-500"
              />
              <p className="mt-0.5 text-[10px] leading-tight text-ink-500">
                {slider.hint}
              </p>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onChange({ ...DEFAULT_PARAMS })}
              className="btn-ghost flex-1 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={onReprocess}
              disabled={!hasImage || isProcessing}
              className="btn-primary flex-1 text-xs"
            >
              {isProcessing ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </>
              ) : (
                'Re-detect Roads'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
