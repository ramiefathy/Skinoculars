export type XRQualityTier = 'low' | 'medium' | 'high';

export const XR_QUALITY_PRESETS: Record<XRQualityTier, { framebufferScale: number; xrInstanceMultiplier: number }> = {
  low: { framebufferScale: 0.7, xrInstanceMultiplier: 0.45 },
  medium: { framebufferScale: 0.8, xrInstanceMultiplier: 0.6 },
  high: { framebufferScale: 1.0, xrInstanceMultiplier: 0.75 }
};

export type PerfMonitorState = {
  tier: XRQualityTier;
  p95Ms: number;
};

export function createPerfMonitor(initialTier: XRQualityTier) {
  let tier = initialTier;
  const samples: number[] = [];
  let lastSwitch = 0;

  const push = (frameMs: number): PerfMonitorState => {
    samples.push(frameMs);
    if (samples.length > 120) samples.shift();
    const sorted = [...samples].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    const p95Ms = sorted[idx] ?? frameMs;
    const now = performance.now();

    if (now - lastSwitch > 5000) {
      if (p95Ms > 28 && tier !== 'low') {
        tier = tier === 'high' ? 'medium' : 'low';
        lastSwitch = now;
      } else if (p95Ms < 18 && tier !== 'high') {
        tier = tier === 'low' ? 'medium' : 'high';
        lastSwitch = now;
      }
    }

    return { tier, p95Ms };
  };

  const reset = (nextTier: XRQualityTier) => {
    tier = nextTier;
    samples.length = 0;
    lastSwitch = performance.now();
  };

  return { push, reset, getTier: () => tier };
}
