import { pick } from '../dom.mjs';
import { letters, naturals, mod } from '../music.mjs';
import { answerFields } from '../answer-fields.mjs';
import { assess } from '../grading.mjs';

const scale = [0,2,4,5,7,9,11];
const degrees = ['I','ii','iii','IV','V','vi'];
const keys = [[0,0],[2,1],[4,2],[5,3],[7,4],[9,5],[10,6],[3,2]];
// Common diatonic phrases; an occasional applied dominant replaces one chord.
const phrases = {
  4:[['I','IV','V','I'],['I','ii','V','I'],['I','vi','V','I']],
  5:[['I','vi','ii','V','I'],['I','IV','ii','V','I'],['I','vi','IV','V','I']],
  6:[
  ['I','vi','IV','ii','V','I'],
  ['I','IV','I','ii','V','I'],
  ['I','iii','vi','IV','V','I'],
  ['I','IV','vi','ii','V','I']
  ],
  7:[['I','iii','vi','IV','ii','V','I'],['I','IV','I','vi','ii','V','I']],
  8:[['I','iii','vi','IV','I','ii','V','I'],['I','IV','I','iii','vi','ii','V','I']]
};

function noteName(pitch, letter) {
  const accidental = mod(pitch - naturals[mod(letter,7)] + 6,12) - 6;
  return letters[mod(letter,7)] + '♯'.repeat(Math.max(0,accidental)) + '♭'.repeat(Math.max(0,-accidental));
}

export function progressionQuestion({sevenths=false,oneOctave=true,chordCount=6}={}) {
  chordCount = Object.hasOwn(phrases,chordCount) ? Number(chordCount) : 6;
  const [tonic,letter] = pick(keys);
  const phrase = [...pick(phrases[chordCount])];
  if (pick([false,false,false,true])) {
    // Preserve the opening tonic and final V–I cadence, and resolve immediately.
    const index = pick(Array.from({length:chordCount-3},(_,index)=>index+1).filter(index=>phrase[index+1]!=='I'));
    phrase[index] = (sevenths ? 'V⁷/' : 'V/') + phrase[index+1];
  }
  const chords = phrase.map((symbol,index)=>{
    const secondary = symbol.includes('/');
    const degree = degrees.indexOf(secondary ? symbol.split('/')[1] : symbol);
    const root = 48 + tonic + scale[degree] + (secondary ? 7 : 0);
    // Anchor the octave to the opening tonic, including keys other than C.
    const bass = 48 + tonic + mod(root-tonic,12) + (!oneOctave && index>0 ? pick([-12,0,12]) : 0);
    const intervals = secondary ? (sevenths ? [0,4,7,10] : [0,4,7]) : [0,[1,2,5].includes(degree) ? 3 : 4,7];
    const rootLetter = letter + degree + (secondary ? 4 : 0);
    const name = noteName(root,rootLetter) + (secondary ? (sevenths ? '7' : '') : [1,2,5].includes(degree) ? 'm' : '');
    return {symbol,name,notes:intervals.map(interval=>bass+interval)};
  });
  let draft = {};
  const options = [...degrees,...degrees.slice(1).map(degree=>(sevenths ? 'V⁷/' : 'V/')+degree)].map(value=>[value,value]);
  return {
    context:`${noteName(tonic,letter)} mayor · ${chordCount} acordes · Hasta 1 dominante secundario.`,
    events:chords.flatMap((chord,index)=>chord.notes.map(note=>[note,index*2,1.8,.08])),
    steps:[{
      prompt:`El primero es I. Identificá los otros ${chordCount-1} acordes en orden.`,
      answer:phrase.join(' → '),
      explanation:chords.map(chord=>`${chord.symbol}: ${chord.name}`).join(' · ') + '. Cada dominante secundario resuelve al grado indicado después de la barra.',
      check:()=>phrase.every((symbol,index)=>draft['chord'+index]===symbol),
      evaluate:()=>assess(phrase.slice(1).map((symbol,index)=>({key:'chord'+(index+1),label:`Acorde ${index+2}`,correct:draft['chord'+(index+1)]===symbol,given:draft['chord'+(index+1)],answer:symbol}))),
      diagnose:()=>phrase.flatMap((symbol,index)=>draft['chord'+index]===symbol ? [] : [`Acorde ${index+1}: elegiste ${draft['chord'+index] || 'sin respuesta'}; era ${symbol}`]),
      editor(container) {
        container.answerDraft ||= {};
        container.answerDraft.chord0 = 'I';
        draft=answerFields(container,phrase.map((_,index)=>({key:'chord'+index,label:`Acorde ${index+1}`,options})));
        container.querySelector('.answer-selectors').classList.add('progression-selectors');
        container.querySelector('select').disabled = true;
      }
    }]
  };
}
