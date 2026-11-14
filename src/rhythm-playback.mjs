import { countIn } from './music.mjs';
import { melodyEvents } from './melody-patterns.mjs';
export function rhythmEvents(measures,meter,backing=[],bass=4,secondary=null) {
  const events=countIn(meter);
  if(secondary) events.push(...melodyEvents(secondary,meter).map(([,time,length])=>[49,time,length,.19,'cymbal']));
  else backing.forEach((bar,index)=>bar.forEach(offset=>events.push([49,meter.beats+index*meter.beats+offset/meter.unit,.24,.19,'cymbal'])));
  events.push(...melodyEvents(measures,meter).map(([pitch,time,length])=>secondary||backing.length?[38,time,length,.19,'snare']:[pitch,time,length,.19]));
  return events;
}
