export type XRModeKind = 'vr' | 'ar' | 'unknown';

export function getSessionModeKind(session: XRSession): XRModeKind {
  const mode = (session as any).environmentBlendMode;
  if (mode === 'opaque') return 'vr';
  if (mode === 'alpha-blend' || mode === 'additive') return 'ar';
  return 'unknown';
}
