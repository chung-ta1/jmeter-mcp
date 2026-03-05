export function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function diffPercent(baseline: number, current: number): string {
  if (baseline === 0) return "N/A";
  const diff = ((current - baseline) / baseline) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}
