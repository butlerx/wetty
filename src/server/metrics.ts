import { Counter } from 'prom-client';
import type { GCStatistics } from 'gc-stats';

const gcLabelNames = ['gctype'];
const gcTypes = {
  0: 'Unknown',
  1: 'Scavenge',
  2: 'MarkSweepCompact',
  3: 'ScavengeAndMarkSweepCompact',
  4: 'IncrementalMarking',
  8: 'WeakPhantom',
  15: 'All',
};

const gcCount = new Counter({
  name: `nodejs_gc_runs_total`,
  help: 'Count of total garbage collections.',
  labelNames: gcLabelNames,
});

const gcTimeCount = new Counter({
  name: `nodejs_gc_pause_seconds_total`,
  help: 'Time spent in GC Pause in seconds.',
  labelNames: gcLabelNames,
});

const gcReclaimedCount = new Counter({
  name: `nodejs_gc_reclaimed_bytes_total`,
  help: 'Total number of bytes reclaimed by GC.',
  labelNames: gcLabelNames,
});

export const gcMetrics = ({ gctype, diff, pause }: GCStatistics): void => {
  const gcType = gcTypes[gctype];

  gcCount.labels(gcType).inc();
  gcTimeCount.labels(gcType).inc(pause / 1e9);

  if (diff.usedHeapSize < 0) {
    gcReclaimedCount.labels(gcType).inc(diff.usedHeapSize * -1);
  }
};
