import { legacyQuestion, intervalQuestion } from './exercises/ear.mjs';
import { keyQuestion } from './exercises/keys.mjs';
import { melodyQuestion } from './exercises/melody.mjs';
import { rhythmQuestion } from './exercises/rhythm.mjs';
import { progressionQuestion } from './exercises/progression.mjs';
import { $ } from './dom.mjs';

// Register an exercise here to include it in both manual and guided practice.
const modes = {
  scales: {title:'Escalas', icon:'↗', short:'Mayor y menores', description:'Identificá el tipo de escala que escuchás.', play:'Escuchar escala', create:()=>legacyQuestion('scales')},
  chords: {title:'Acordes', icon:'♬', short:'Tipos de tríada', description:'Identificá el tipo de tríada que escuchás.', play:'Escuchar acorde', create:()=>legacyQuestion('chords')},
  harmony: {title:'Dominantes secundarias', label:'Dominantes', icon:'♯', short:'Funciones y sensibles', description:'Identificá la función del acorde y la nota que conduce a su resolución.', play:'Escuchar resolución', create:()=>legacyQuestion('harmony')},
  keyRead: {title:'Lectura de armaduras', icon:'𝄞', short:'Claves de Sol y Fa', description:'Reconocé la tonalidad mayor y su relativa menor.', create:()=>keyQuestion(false)},
  keyWrite: {title:'Escritura de armaduras', icon:'♭', short:'Claves de Sol y Fa', description:'Ubicá las alteraciones en el pentagrama.', create:()=>keyQuestion(true)},
  sightRead: {title:'Solfeo leído', icon:'♩', short:'Notas y ritmo', description:'Leé los nombres de las notas en voz alta y respetá el pulso.', play:'Escuchar pulso', meter:true, create:()=>melodyQuestion('sightRead')},
  sightSing: {title:'Solfeo cantado', icon:'♪', short:'Melodías simples', description:'Cantá la melodía a partir de la nota inicial.', play:'Escuchar nota inicial y pulso', meter:true, create:()=>melodyQuestion('sightSing')},
  dictation: {title:'Transcripción melódica', icon:'♫', short:'Dos o cuatro compases', description:'Escuchá y escribí la melodía de dos o cuatro compases.', play:'Escuchar melodía', meter:true, create:()=>melodyQuestion('dictation')},
  rhythm: {title:'Ritmo y síncopa', icon:'♩', short:'Dictado de dos compases', description:'Transcribí ritmos con síncopa en compases simples y compuestos.', play:'Escuchar dictado', meter:true, create:()=>rhythmQuestion()},
  polyrhythm: {title:'Polirritmia 3 contra 2', icon:'3∶2', short:'Dictado a dos voces', description:'Escribí la voz melódica sobre el acompañamiento de dos golpes por pulso.', play:'Escuchar polirritmia', meter:true, create:()=>rhythmQuestion('poly')},
  tuplets: {title:'Grupos irregulares', icon:'⅗', short:'Dosillos a quintillos', description:'Transcribí dosillos, tresillos, cuatricillos y quintillos.', play:'Escuchar dictado', meter:true, create:()=>rhythmQuestion('tuplet')},
  intervals: {title:'Intervalos', icon:'↕', short:'Ascendentes y descendentes', description:'Identificá el intervalo y su dirección.', play:'Escuchar intervalo', create:intervalQuestion},
  progressions: {title:'Progresión de acordes', icon:'→', short:'Acordes y sus grados', description:'Reconocé los acordes de una progresión y elegí si incluye dominantes secundarias.', play:'Escuchar progresión', create:()=>progressionQuestion({sevenths:$('progression-sevenths').checked,oneOctave:$('progression-octave').checked,chordCount:Number($('progression-count').value),dominants:$('progression-dominants').value})}
};

export { modes };
