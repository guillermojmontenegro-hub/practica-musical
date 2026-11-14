const gains={piano:14,guitar:11,flute:7,clarinet:6,marimba:10};
export const melodicSampleOptions=instrument=>({volume:100,extraGain:gains[instrument]});
export function sampleVelocity(volume,percussion=false) {
  return Math.min(110,Math.max(percussion?35:80,Math.round(volume*500)));
}
export function instrumentOutput(context) {
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=20;
  limiter.attack.value=.001;limiter.release.value=.12;
  limiter.connect(context.destination);return limiter;
}
