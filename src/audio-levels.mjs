const gains={piano:14,guitar:11,flute:7,clarinet:6,marimba:10};
export const outputVolume=.512;
export const melodicSampleOptions=instrument=>({volume:100,extraGain:gains[instrument]});
export function sampleVelocity(volume,percussion=false) {
  return Math.min(110,Math.max(percussion?35:80,Math.round(volume*500)));
}
export function instrumentOutput(context) {
  // Keep ordinary levels linear; round only peaks near the output ceiling.
  const limiter=context.createWaveShaper();
  limiter.curve=Float32Array.from({length:8193},(_,index)=>{
    const x=index/4096-1,absolute=Math.abs(x);
    return Math.sign(x)*(absolute<=.8?absolute:.8+.16*Math.tanh((absolute-.8)/.16));
  });
  limiter.oversample='4x';
  const gain=context.createGain();gain.gain.value=4;
  const output=context.createGain();output.gain.value=outputVolume;
  gain.connect(limiter);limiter.connect(output);output.connect(context.destination);return gain;
}

// Match the rendered attack RMS (first 120 ms), including the playback envelope.
export function percussionOutput(context,instrument,destination) {
  const gain=context.createGain();gain.gain.value=instrument==='snare'?1.96:1.66;
  gain.connect(destination);return gain;
}
