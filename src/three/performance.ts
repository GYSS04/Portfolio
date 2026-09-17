export type QualityTier = 'low' | 'balanced' | 'high';

export interface RenderProfile {
  tier: QualityTier;
  pixelRatio: number;
  antialias: boolean;
  bloom: boolean;
  shadows: boolean;
  fireShadow: boolean;
  activeFps: number;
  idleFps: number;
}

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

/** A conservative starting profile that favours a smooth walkthrough over maximum effects. */
export function detectRenderProfile(): RenderProfile {
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tier: QualityTier = 'high';
  if (coarsePointer || cores <= 4 || memory <= 4 || reducedMotion) tier = 'low';
  else if (cores <= 8 || memory <= 8) tier = 'balanced';

  if (tier === 'low') {
    return {
      tier,
      pixelRatio: Math.min(window.devicePixelRatio, 1),
      antialias: false,
      bloom: false,
      shadows: false,
      fireShadow: false,
      activeFps: 30,
      idleFps: 12,
    };
  }

  if (tier === 'balanced') {
    return {
      tier,
      pixelRatio: Math.min(window.devicePixelRatio, 1.25),
      antialias: true,
      bloom: false,
      shadows: true,
      fireShadow: false,
      activeFps: 45,
      idleFps: 15,
    };
  }

  return {
    tier,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    antialias: true,
    bloom: true,
    shadows: true,
    fireShadow: true,
    activeFps: 60,
    idleFps: 20,
  };
}
