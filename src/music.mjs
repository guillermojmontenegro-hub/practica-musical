import { $, pick } from './dom.mjs';
import { countInLevel } from './audio-levels.mjs';

const letters = ['Do','Re','Mi','Fa','Sol','La','Si'];
const naturals = [0,2,4,5,7,9,11];
const pitchNames = ['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','Sol♯','La','Si♭','Si'];
const meters = {
  simple: [{top:2,bottom:4,beats:2,unit:2},{top:3,bottom:4,beats:3,unit:2},{top:4,bottom:4,beats:4,unit:2}],
  compound: [{top:6,bottom:8,beats:2,unit:3},{top:9,bottom:8,beats:3,unit:3}]
};
const clefs = {
  sol:{symbol:'𝄞', bottom:2, shift:0},
  fa:{symbol:'𝄢', bottom:-10, shift:-14}
};
const figureDefinitions = {
  8:{label:'Redonda',duration:'w'},
  4:{label:'Blanca',duration:'2'},
  12:{label:'Redonda con puntillo',duration:'wd',dot:true,baseLength:8},
  6:{label:'Blanca con puntillo',duration:'2d',dot:true,baseLength:4},
  2:{label:'Negra',duration:'4'},
  1:{label:'Corchea',duration:'8',flag:'flag8thUp'},
  '0.5':{label:'Semicorchea',duration:'16',flag:'flag16thUp'},
  '0.25':{label:'Fusa',duration:'32',flag:'flag32ndUp'},
  3:{label:'Negra con puntillo',duration:'4d',dot:true,baseLength:2},
  '1.5':{label:'Corchea con puntillo',duration:'8d',dot:true,baseLength:1,flag:'flag8thUp'},
  '0.75':{label:'Semicorchea con puntillo',duration:'16d',dot:true,baseLength:.5,flag:'flag16thUp'},
  '0.375':{label:'Fusa con puntillo',duration:'32d',dot:true,baseLength:.25,flag:'flag32ndUp'}
};
const figures=Object.fromEntries(Object.entries(figureDefinitions).map(([length,figure])=>[length,figure.label]));
const baseFigureTools=[8,4,2,1,.5,.25].map(length=>[String(length),figureDefinitions[length].label]);
const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
const pitchLabel = note => letters[mod(note,7)] + (4 + Math.floor(note/7));
const midi = note => 60 + 12*Math.floor(note/7) + naturals[mod(note,7)];
const clefLabel = clef => clef === 'sol' ? 'Sol' : 'Fa';
const clefChoices = ['sol','fa','both'];
function selectClef() {
  const value = $('sight-clef')?.value;
  return clefChoices.includes(value) ? value : 'sol';
}
function selectMeter() {
  const family = $('meter-choice').value;
  return pick(family === 'mixed' ? [...meters.simple,...meters.compound] : meters[family]);
}

export const tempoUnitLabel=meter=>meter.unit===3?'negra con puntillo':'negra';
const meterLabel = meter => meter.top + '/' + meter.bottom;
function countIn(meter) {
  return Array.from({length:meter.beats},(_,index)=>[index===0 ? 84 : 79,index,.09,countInLevel,'click']);
}

export { letters, naturals, pitchNames, meters, clefs, figures, figureDefinitions, baseFigureTools, mod, pitchLabel, midi, clefLabel, clefChoices, selectClef, selectMeter, meterLabel, countIn };
