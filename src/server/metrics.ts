import { PerformanceObserver, constants } from 'node:perf_hooks';
import { Counter } from 'prom-client';

const gcLabelNames = ['gctype'];
const gcTypes: Record<number, string> = {
  [constants.NODE_PERFORMANCE_GC_MINOR]: 'Scavenge',
  [constants.NODE_PERFORMANCE_GC_MAJOR]: 'MarkSweepCompact',
  [constants.NODE_PERFORMANCE_GC_INCREMENTAL]: 'IncrementalMarking',
  [constants.NODE_PERFORMANCE_GC_WEAKCB]: 'WeakPhantom',
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

export function observeGC(): void {
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const kind =
        (entry as unknown as { detail?: { kind?: number } }).detail?.kind ?? 0;
      const gcType = gcTypes[kind] ?? 'Unknown';
      gcCount.labels(gcType).inc();
      gcTimeCount.labels(gcType).inc(entry.duration / 1000);
    }
  });
  obs.observe({ entryTypes: ['gc'] });
}
