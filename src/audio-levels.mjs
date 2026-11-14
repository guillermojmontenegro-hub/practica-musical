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

// Match the rendered attack RMS (first 120 ms), including the playback envelope.
export function percussionOutput(context,instrument,destination) {
  const gain=context.createGain();gain.gain.value=instrument==='snare'?3.04:1.66;
  gain.connect(destination);return gain;
}
