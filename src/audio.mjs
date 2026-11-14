const instruments = {
  piano: {name:'Piano', attack:.007, sustain:.27, partials:[[1,1],[2,.38],[3,.22],[4.01,.12],[6.02,.06]], decay:.20},
  guitar: {name:'Guitarra', attack:.004, sustain:.19, partials:[[1,1],[2,.5],[3,.27],[4,.19],[5,.11]], decay:.14},
  flute: {name:'Flauta', attack:.055, sustain:.86, partials:[[1,1],[2,.11],[3,.075]], decay:.30},
  clarinet: {name:'Clarinete', attack:.033, sustain:.78, partials:[[1,1],[3,.37],[5,.14],[7,.05]], decay:.23},
  marimba: {name:'Marimba', attack:.003, sustain:.07, partials:[[1,1],[4,.32],[9.02,.14]], decay:.10},
  click: {attack:.002, sustain:.09, partials:[[1,1],[2.4,.23]], decay:.025}
};

let audio;
let exercise;
let alarm;

async function unlockAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  try {
    audio ||= new Audio();
    await audio.resume();
    return audio.state === 'running';
  } catch { return false; }
}

function channel() {
  const bus = audio.createGain();
  bus.connect(audio.destination);
  return bus;
}

function tone(midi,time,duration,volume,bus,instrument) {
  const {attack,sustain,partials,decay} = instruments[instrument];
  const gain = audio.createGain();
  gain.connect(bus);
  const peak = Math.min(attack,duration*.22);
  const body = Math.min(duration*.72,peak+decay);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.exponentialRampToValueAtTime(volume,time+peak);
  gain.gain.exponentialRampToValueAtTime(volume*sustain,time+body);
  gain.gain.setValueAtTime(volume*sustain,time+Math.max(body,duration-.046));
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  const voices = partials.map(([ratio,level])=>{
    const osc = audio.createOscillator(), partial = audio.createGain();
    osc.frequency.value = 440 * 2**((midi-69)/12) * ratio;
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(time);
    osc.stop(time+duration+.008);
    osc.addEventListener('ended',()=>{
      osc.disconnect();
      partial.disconnect();
    },{once:true});
    return osc;
  });
  voices.at(-1).addEventListener('ended',()=>gain.disconnect(),{once:true});
  return voices;
}

function stopExerciseAudio() {
  if (!exercise) return;
  const {bus,voices} = exercise;
  exercise = undefined;
  bus.disconnect();
  for (const osc of voices) {
    try { osc.stop(); } catch {}
  }
}

function playExercise(events,{instrument,bpm},finished) {
  stopExerciseAudio();
  const start = audio.currentTime + .035;
  const beat = 60/bpm;
  const bus = channel();
  const voices = [];
  let end = -Infinity;
  let last;
  for (const [note,offset,duration,volume,voice] of events) {
    const length = voice === 'click' ? .052 : duration*beat;
    const scheduled = tone(note,start+offset*beat,length,volume,bus,voice || instrument);
    voices.push(...scheduled);
    if (offset*beat+length >= end) {
      end = offset*beat+length;
      last = scheduled.at(-1);
    }
  }
  const playback = {bus,voices};
  exercise = playback;
  last.addEventListener('ended',()=>{
    if (exercise !== playback) return;
    stopExerciseAudio();
    finished();
  },{once:true});
}

function ring() {
  if (audio?.state !== 'running') return;
  alarm?.disconnect();
  const bus = channel();
  alarm = bus;
  const start = audio.currentTime + .02;
  const last = [76,79,84].map((note,index)=>tone(note,start+index*.23,.21,.15,bus,'flute')).at(-1).at(-1);
  last.addEventListener('ended',()=>{
    bus.disconnect();
    if (alarm === bus) alarm = undefined;
  },{once:true});
}

function newClickTrack() {
  const bus = channel();
  return {
    now:()=>audio.currentTime,
    click:(time,note,volume)=>tone(note,time,.055,volume,bus,'click'),
    stop:()=>bus.disconnect()
  };
}
export { instruments, unlockAudio, playExercise, stopExerciseAudio, ring, newClickTrack };
