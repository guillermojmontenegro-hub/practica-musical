import { answerFields } from '../answer-fields.mjs';
import { $, pick, shuffle } from '../dom.mjs';
import { clefs, clefLabel, pitchLabel, selectMeter } from '../music.mjs';
import { staffEditor } from '../staff-editor.mjs';
import { staff } from '../notation.mjs';
import { assess } from '../grading.mjs';

const signatures = {
  '♯':[10,7,11,8,5,9,6],
  '♭':[6,9,5,8,4,7,3]
};
const tonalities = [
  'Do♭ / La♭ menor','Sol♭ / Mi♭ menor','Re♭ / Si♭ menor','La♭ / Fa menor',
  'Mi♭ / Do menor','Si♭ / Sol menor','Fa / Re menor','Do / La menor',
  'Sol / Mi menor','Re / Si menor','La / Fa♯ menor','Mi / Do♯ menor',
  'Si / Sol♯ menor','Fa♯ / Re♯ menor','Do♯ / La♯ menor'
];
function keyQuestion(write) {
  const clef = pick(Object.keys(clefs));
  const meter = null;
  const number = pick(Array.from({length:15},(_,index)=>index-7));
  const symbol = number < 0 ? '♭' : '♯';
  const signs = signatures[symbol].slice(0,Math.abs(number)).map(note=>note+clefs[clef].shift);
  const title = tonalities[number+7];
  const context = `Clave de ${clefLabel(clef)}` + (meter?` · ${meter.top}/${meter.bottom}`:'');
  const solution = staff({clef,meter,showMeter:false,signs,symbol,label:`${context}, ${Math.abs(number)} ${number<0?'bemoles':'sostenidos'}`});
  if (!write) {
    const requested=$('key-practice')?.value;
    const mode=['major','minor'].includes(requested)?requested:'both';
    const names={major:title.split(' / ')[0],minor:title.split(' / ')[1].replace(' menor','')};
    const parse=value=>{const match=/^(Do|Re|Mi|Fa|Sol|La|Si)(♯|♭)?$/.exec(value);return {note:match[1],alter:match[2]||'natural'};};
    const expected={major:parse(names.major),minor:parse(names.minor)};
    const types=mode==='both'?['major','minor']:[mode];let draft={};
    const noteOptions=['Do','Re','Mi','Fa','Sol','La','Si'].map(note=>[note,note]);
    const alterOptions=[['natural','♮'],['♯','♯'],['♭','♭']];
    return {context,notation:solution,steps:[{
      prompt:mode==='both'?'Indicá la tonalidad mayor y su relativa menor.':`Indicá la tonalidad ${mode==='major'?'mayor':'menor'}.`,
      answer:types.map(type=>`${names[type]} ${type==='major'?'mayor':'menor'}`).join(' / '),
      check:()=>types.every(type=>draft[type+'Note']===expected[type].note&&draft[type+'Alter']===expected[type].alter),
      evaluate:()=>assess(types.flatMap(type=>[
        {key:type+'Note',label:`Nota ${type==='major'?'mayor':'menor'}`,correct:draft[type+'Note']===expected[type].note,given:draft[type+'Note'],answer:expected[type].note},
        {key:type+'Alter',label:`Alteración ${type==='major'?'mayor':'menor'}`,correct:draft[type+'Alter']===expected[type].alter,given:draft[type+'Alter']==='natural'?'♮':draft[type+'Alter'],answer:expected[type].alter==='natural'?'♮':expected[type].alter}
      ])),
      diagnose:()=>types.flatMap(type=>{
        const suffix=type==='major'?'mayor':'menor',errors=[];
        if(draft[type+'Note']!==expected[type].note)errors.push(`Nota de la tonalidad ${suffix}`);
        if(draft[type+'Alter']!==expected[type].alter)errors.push(`Alteración de la tonalidad ${suffix}`);return errors;
      }),
      explanation:number?`${signs.length} ${symbol}.`:'Sin alteraciones.',
      editor(container) {
        draft=answerFields(container,types.flatMap(type=>[
          {key:type+'Note',label:`Nota ${type==='major'?'mayor':'menor'}`,options:noteOptions},
          {key:type+'Alter',label:`Alteración ${type==='major'?'mayor':'menor'}`,options:alterOptions}
        ]));
      }
    }]};
  }
  const entered = [];
  let kind;
  const history=[];
  return {context,notation:staff({clef,meter,showMeter:false,label:context}),steps:[{
    prompt:`Escribí la armadura de ${title}.`,
    answer:number ? `${signs.length} ${symbol} · ${signs.map(pitchLabel).join(' – ')}` : 'Sin alteraciones',
    solution,compare:true,
    diagnose:()=>{
      const errors=[];
      if(kind!==(number ? symbol : 'none')) errors.push('Tipo de alteración en la armadura');
      if(entered.length!==signs.length) errors.push('Cantidad de alteraciones');
      if(entered.some((pitch,index)=>pitch!==signs[index])) errors.push('Ubicación u orden de las alteraciones');
      return errors;
    },
    check:()=>kind === (number ? symbol : 'none') &&
      entered.length === signs.length && entered.every((pitch,index)=>pitch===signs[index]),
    evaluate:()=>{
      const correctKind=kind===(number?symbol:'none');
      return assess([
        {label:'Tipo de alteración',correct:correctKind,given:kind==='none'?'Sin alteraciones':kind,answer:number?symbol:'Sin alteraciones'},
        {label:'Cantidad de alteraciones',correct:entered.length===signs.length,given:String(entered.length),answer:String(signs.length)},
        ...Array.from({length:Math.max(entered.length,signs.length)},(_,index)=>({label:`Alteración ${index+1}`,correct:entered[index]===signs[index],given:entered[index]===undefined?'Falta':pitchLabel(entered[index]),answer:signs[index]===undefined?'No corresponde':pitchLabel(signs[index])}))
      ],{signs:entered.map((pitch,index)=>correctKind&&pitch===signs[index])});
    },
    editor(container) {
      staffEditor(container,{
        tools:[['♯','♯ Sostenido'],['♭','♭ Bemol'],['none','Sin alteraciones']],
        draw:()=>staff({clef,meter,showMeter:false,signs:entered,symbol:kind,label:context,edit:'signs',pitches:Array.from({length:12},(_,i)=>clefs[clef].bottom+i-1)}),
        ready:()=>kind==='none' || entered.length>0,
        status:()=>kind==='none' ? 'Sin alteraciones' : entered.map(pitchLabel).join(' · '),
        editable:true,
        place(_,position,tool,index=null) {
          if(tool==='delete') {
            if(index===null||!entered[index]&&entered[index]!==0) return {ok:false,message:'Seleccioná una alteración.'};
          } else if(tool!=='none'&&(position < -1 || position > 10)) return {ok:false,message:'Esa altura no corresponde a la armadura.'};
          if(index===null&&tool!=='none'&&tool!=='delete'&&entered.length===7) return {ok:false,message:'La armadura admite hasta siete alteraciones.'};
          history.push({signs:[...entered],kind});
          if(tool==='delete') entered.splice(index,1);
          else if(tool==='none') {entered.length=0;kind='none';}
          else {kind=tool;if(index===null) entered.push(clefs[clef].bottom+position);else entered[index]=clefs[clef].bottom+position;}
          return {ok:true,index:tool==='none'||tool==='delete'?null:index};
        },
        undo() {
          const previous=history.pop();if(!previous) return {ok:false,message:'No hay cambios para deshacer.'};
          entered.splice(0,entered.length,...previous.signs);kind=previous.kind;
          return {ok:true,index:null};
        }
      });
    }
  }]};
}

export { keyQuestion };
