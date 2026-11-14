import assert from 'node:assert/strict';
import { StaveNote, Tuplet } from 'vexflow';
import { noteSpelling, tupletRanges } from '../src/notation-spec.mjs';
const eighthTicks=new StaveNote({keys:['b/4'],duration:'8'}).getTicks().value();
export function assertWrittenDurations(source) {
  const notes=source.map(note=>new StaveNote({keys:['b/4'],duration:noteSpelling(note).duration}));
  for(const range of tupletRanges(source))if(range.irregular)new Tuplet(notes.slice(range.start,range.end),{num_notes:range.size,notes_occupied:range.occupied,ratioed:false});
  notes.forEach((note,index)=>assert.ok(Math.abs(note.getTicks().value()/eighthTicks-source[index].length)<1e-8,`Written duration differs at note ${index}`));
}
