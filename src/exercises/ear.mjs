import { $, pick, shuffle } from '../dom.mjs';
import { letters, naturals, pitchNames, mod, selectMeter } from '../music.mjs';
import { assess } from '../grading.mjs';

const major = [0,2,4,5,7,9,11,12];
const natural = [0,2,3,5,7,8,10,12];
const scales = [
  ['Mayor',major,major,'Tiene tercera mayor y el VII grado está a un semitono de la tónica.'],
  ['Menor natural',natural,natural,'Tiene tercera menor y el VI y el VII grados descienden un semitono respecto de la mayor.'],
  ['Menor armónica',[0,2,3,5,7,8,11,12],[0,2,3,5,7,8,11,12],'Eleva el VII grado de la menor natural. Entre el VI y el VII queda una segunda aumentada.'],
  ['Menor melódica',[0,2,3,5,7,9,11,12],natural,'En la forma clásica, eleva el VI y el VII al subir y vuelve a la menor natural al bajar.']
];
const chords = [
  ['Mayor',[0,4,7],'Tercera mayor y quinta justa desde la fundamental.'],
  ['Menor',[0,3,7],'Tercera menor y quinta justa desde la fundamental.'],
  ['Aumentado',[0,4,8],'Tercera mayor y quinta aumentada desde la fundamental.'],
  ['Disminuido',[0,3,6],'Tercera menor y quinta disminuida desde la fundamental.']
];
const keys = [[0,0],[2,1],[4,2],[5,3],[7,4],[9,5],[10,6],[3,2]];
const degrees = [[1,'ii'],[2,'iii'],[3,'IV'],[4,'V'],[5,'vi']];
function nameNote(pitch, letter) {
  const index = letter % 7;
  const accidental = ((pitch - naturals[index] + 6) % 12 + 12) % 12 - 6;
  return letters[index] + '♯'.repeat(Math.max(0, accidental)) + '♭'.repeat(Math.max(0, -accidental));
}
function earQuestion(type, index, root) {
  const scale = type === 'scales';
  const data = scale ? scales : chords;
  const [answer, intervals] = data[index];
  const sequence = scale ? [...intervals, ...data[index][2].slice(0,-1).reverse()] : intervals;
  return {root, notes:sequence.map(note => root + note), steps:[{
    prompt:scale ? '¿Qué tipo de escala escuchaste?' : '¿Qué tipo de acorde escuchaste?',
    options:data.map(item => item[0]), answer,
    explanation: (scale ? 'Tónica: ' : 'Fundamental: ') + pitchNames[root % 12] + '. ' + data[index][scale ? 3 : 2]
  }]};
}
function harmonyQuestion(keyIndex, degreeIndex) {
  const [tonic, letter] = keys[keyIndex];
  const [degree, roman] = degrees[degreeIndex];
  const target = 60 + tonic + major[degree] - 12;
  const targetLetter = letter + degree;
  const root = target + 7;
  const dominant = [0,4,7,10].map(interval => root + interval);
  const notes = dominant.map((note,i) => nameNote(note,targetLetter + 4 + i*2));
  const targetName = nameNote(target,targetLetter);
  const symbol = notes[0] + '7';
  const answer = 'V⁷/' + roman;
  const homeKey = nameNote(tonic,letter) + ' mayor';
  const scale = major.slice(0,7).map((interval,index)=>nameNote(tonic+interval,letter+index));
  return {dominant, resolution:[target+12,target+12+([1,2,5].includes(degree)?3:4),target+19],
    harmony:{homeKey,scale:scale.join(' · '),chord:symbol + ' (' + notes.join(' · ') + ')'},
    steps:[
      {prompt:'¿De qué grado de la tonalidad principal es dominante este acorde?',options:shuffle(degrees.filter(item=>item[1]!==roman)).slice(0,3).map(item=>'V⁷/'+item[1]).concat(answer),answer,
        explanation:symbol + ' es la dominante de ' + targetName + ', el grado ' + roman + ' de la tonalidad.'},
      {prompt:'¿Qué nota del acorde sube un semitono hacia la fundamental del acorde de llegada?',options:notes,answer:notes[1],
        explanation:notes[1] + ' es la tercera de ' + symbol + ' y sube un semitono a ' + targetName + '.'}
    ]};
}
function legacyQuestion(mode) {
  const combinations = mode === 'harmony'
    ? keys.flatMap((_,key) => degrees.map((_,degree) => [key,degree]))
    : [0,1,2,3].flatMap(index => Array.from({length:12},(_,pitch)=>[index,pitch+55]));
  const pair = pick(combinations);
  return mode === 'harmony' ? harmonyQuestion(...pair) : earQuestion(mode,...pair);
}
function intervalQuestion() {
  const meter = selectMeter();
  const intervals = [
    [1,'2.ª menor'],[2,'2.ª mayor'],[3,'3.ª menor'],[4,'3.ª mayor'],[5,'4.ª justa'],
    [6,'Tritono'],[7,'5.ª justa'],[8,'6.ª menor'],[9,'6.ª mayor'],[10,'7.ª menor'],[11,'7.ª mayor'],[12,'8.ª justa']
  ];
  const [distance,name] = pick(intervals);
  const direction = pick([-1,1]);
  const root = pick([60,62,64,65,67,69]);
  const ending = root + distance*direction;
  const events = [[root,0,.82,.15],[ending,1,.82,.15]];
  const suffix = sign => sign === 1 ? 'ascendente' : 'descendente';
  const canonical={1:[2,'Menor'],2:[2,'Mayor'],3:[3,'Menor'],4:[3,'Mayor'],5:[4,'Justo'],6:[4,'Aumentado'],7:[5,'Justo'],8:[6,'Menor'],9:[6,'Mayor'],10:[7,'Menor'],11:[7,'Mayor'],12:[8,'Justo']}[distance];
  const accepted=distance===6 ? [[4,'Aumentado'],[5,'Disminuido']] : [canonical];
  let draft={};
  return {events,steps:[{
    prompt:'¿Qué intervalo escuchás?',
    answer:`${canonical[0]}.º ${canonical[1].toLowerCase()} ${suffix(direction)}`,
    check:()=>accepted.some(([number,quality])=>Number(draft.number)===number&&draft.quality===quality)&&draft.direction===String(direction),
    evaluate:()=>{
      const matching=accepted.find(([number])=>number===Number(draft.number))||canonical;
      return assess([
        {key:'number',label:'Intervalo',correct:accepted.some(([number])=>number===Number(draft.number)),given:draft.number,answer:`${canonical[0]}.º`},
        {key:'quality',label:'Calidad',correct:draft.quality===matching[1],given:draft.quality,answer:matching[1]},
        {key:'direction',label:'Dirección',correct:draft.direction===String(direction),given:draft.direction==='1'?'Ascendente':draft.direction==='-1'?'Descendente':'',answer:direction===1?'Ascendente':'Descendente'}
      ]);
    },
    diagnose:()=>{
      const errors=[];
      if(!accepted.some(([number])=>number===Number(draft.number)))errors.push('Número del intervalo');
      if(!accepted.some(([number,quality])=>number===Number(draft.number)&&quality===draft.quality))errors.push('Calidad del intervalo');
      if(draft.direction!==String(direction))errors.push('Dirección del intervalo');return errors;
    },
    explanation:`${pitchNames[mod(root,12)]} → ${pitchNames[mod(ending,12)]} · ${distance} ${distance===1?'semitono':'semitonos'}.`,
    editor(container) {
      draft=container.answerDraft||{};
      const row=document.createElement('div');row.className='interval-selectors';
      for(const [key,label,options] of [
        ['number','Intervalo',Array.from({length:7},(_,i)=>[String(i+2),`${i+2}.º`])],
        ['quality','Calidad',['Mayor','Menor','Justo','Aumentado','Disminuido'].map(value=>[value,value])],
        ['direction','Dirección',[['1','Ascendente'],['-1','Descendente']]]
      ]) {
        const wrapper=document.createElement('label');wrapper.append(label);
        const input=document.createElement('select');input.setAttribute('aria-label',label);input.add(new Option('Elegí…',''));
        input.dataset.answerKey=key;
        options.forEach(([value,text])=>input.add(new Option(text,value)));input.value=draft[key]||'';
        input.addEventListener('change',()=>{draft[key]=input.value;update();container.saveAnswerDraft?.();});wrapper.append(input);row.append(wrapper);
      }
      function update() {$('next').disabled=!draft.number||!draft.quality||!draft.direction;}
      container.append(row);update();
    }
  }]};
}

export { legacyQuestion, intervalQuestion };
