import { Waypoints, GitFork, Clock, Layers } from 'lucide-react';
import type { DetectionResult } from '@/lib/types';

interface RoadStatsProps {
  detection: DetectionResult;
}

export function RoadStats({ detection }: RoadStatsProps) {
  const intersections = Array.from(detection.graph.nodes.values()).filter(
    (n) => n.isIntersection
  ).length;

  const totalRoadLength = detection.segments.reduce(
    (sum, s) => sum + s.length,
    0
  );

  const stats = [
    {
      label: 'Roads detected',
      value: detection.segments.length,
      icon: Waypoints,
      color: 'text-road-400',
      bg: 'bg-road-500/10',
    },
    {
      label: 'Intersections',
      value: intersections,
      icon: GitFork,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total length',
      value: `${Math.round(totalRoadLength)}`,
      unit: 'units',
      icon: Layers,
      color: 'text-accent-400',
      bg: 'bg-accent-500/10',
    },
    {
      label: 'Processing time',
      value: `${(detection.processingTime / 1000).toFixed(2)}`,
      unit: 's',
      icon: Clock,
      color: 'text-ink-300',
      bg: 'bg-ink-700/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-ink-800 bg-ink-900/50 p-3"
        >
          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <p className="text-xl font-bold text-white">{stat.value}</p>
          {stat.unit && <span className="text-sm text-ink-400">{stat.unit}</span>}
          <p className="text-xs text-ink-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
