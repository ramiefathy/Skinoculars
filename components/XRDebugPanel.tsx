import React from 'react';

export type XRDebugInfo = {
  modeKind: string;
  environmentBlendMode: string;
  enabledFeatures: string[] | null;
  inputSourceCount: number;
  perfTier?: string;
};

export const XRDebugPanel: React.FC<{
  info: XRDebugInfo | null;
}> = ({ info }) => {
  if (!info) return null;
  const handleCopy = () => {
    const payload = JSON.stringify(info, null, 2);
    navigator.clipboard?.writeText(payload).catch(() => {
      console.warn('Unable to copy XR debug info.');
    });
  };
  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-auto bg-slate-900/80 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700/70 space-y-1 max-w-[260px]">
      <div className="font-semibold text-slate-200">XR Debug</div>
      <div>Mode: {info.modeKind}</div>
      <div>Blend: {info.environmentBlendMode}</div>
      <div>Inputs: {info.inputSourceCount}</div>
      <div>Tier: {info.perfTier ?? 'n/a'}</div>
      <div className="truncate">Features: {info.enabledFeatures ? info.enabledFeatures.join(', ') : 'unsupported'}</div>
      <button
        onClick={handleCopy}
        className="mt-1 w-full bg-slate-700/70 hover:bg-slate-600/70 text-slate-100 rounded px-2 py-1"
      >
        Copy XR Debug JSON
      </button>
    </div>
  );
};
