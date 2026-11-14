import { countIn, midi } from './music.mjs';
import { melodyEvents } from './melody-patterns.mjs';
export function rhythmEvents(measures,meter,backing=[],bass=4,secondary=null) {
  const events=countIn(meter);
  if(secondary) events.push(...melodyEvents(secondary,meter).map(([pitch,time,length])=>[pitch,time,length,.12,'marimba']));
  else backing.forEach((bar,index)=>bar.forEach(offset=>events.push([midi(bass),meter.beats+index*meter.beats+offset/meter.unit,.24,.12,'marimba'])));
  events.push(...melodyEvents(measures,meter).map(([pitch,time,length])=>[pitch,time,length,.19]));
  return events;
}
