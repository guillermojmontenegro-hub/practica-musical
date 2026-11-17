// Internal credit is earned per requested answer, never per prefilled field.
export function assess(items,notation) {
  const results=items.map(item=>({...item,earned:item.earned??Number(item.correct),total:item.total??1}));
  const earned=results.reduce((sum,item)=>sum+item.earned,0);
  const total=results.reduce((sum,item)=>sum+item.total,0);
  return {items:results,notation,earned,total,credit:total?earned/total:0,correct:total>0&&results.every(item=>item.correct)};
}

export function combinedCredit(outcomes) {
  const earned=outcomes.reduce((sum,item)=>sum+(item?.earned??Number(item?.correct||false)),0);
  const total=outcomes.reduce((sum,item)=>sum+(item?.total??1),0);
  return total?earned/total:0;
}

// Compare sounding events at their actual onset, preserving links to written notes.
// Tied spellings of the same sound share a result, including cross-bar ties.
function events(bars) {
  const result=[];let offset=0,previous;
  bars.forEach((bar,b)=>bar.forEach((note,n)=>{
    const position=[b,n];
    if(previous?.tie&&!previous.rest&&!note.rest&&previous.pitch===note.pitch) {
      result.at(-1).length+=note.length;result.at(-1).positions.push(position);
    } else result.push({...note,offset,positions:[position]});
    offset+=note.length;previous=note;
  }));
  return result;
}
const close=(a,b)=>Math.abs(a-b)<1e-6;
export function transcriptionAssessment(entered,expected,{rhythm=false}={}) {
  const items=[],notes=entered.map(bars=>bars.map(bar=>bar.map(()=>false)));
  expected.forEach((bars,voice)=>{
    const actual=events(entered[voice]||[]),target=events(bars),used=new Set();
    target.forEach(note=>{
      const at=actual.findIndex(other=>close(other.offset,note.offset));
      const other=actual[at];if(other)used.add(at);
      const pitch=Boolean(other)&&Boolean(other.rest)===Boolean(note.rest)&&(rhythm||note.rest||other.pitch===note.pitch);
      const length=Boolean(other)&&close(other.length,note.length);
      const [bar,noteIndex]=note.positions[0];
      const label=`${expected.length>1?`Voz ${voice+1} · `:''}Compás ${bar+1} · ${note.rest?'Silencio':'Nota'} ${noteIndex+1}`;
      const correct=pitch&&length;
      items.push({label,correct,earned:Number(pitch)+Number(length),total:2,
        detail:correct?'':!other?'Falta este ataque.':[!pitch?(rhythm?'Revisá nota o silencio.':'Revisá la altura o el silencio.'):'',!length?'Revisá la duración.':''].filter(Boolean).join(' ')});
      if(other)other.positions.forEach(([b,n])=>{notes[voice][b][n]=correct;});
    });
    actual.forEach((note,index)=>{
      if(used.has(index))return;
      items.push({label:`${expected.length>1?`Voz ${voice+1} · `:''}Compás ${note.positions[0][0]+1} · Ataque extra`,correct:false,earned:0,total:2,detail:'Este ataque no aparece en la referencia.'});
    });
  });
  return assess(items,{notes});
}

export function showAnswerReview(container,outcomes,host=container,{mistakesOnly=false}={}) {
  const items=outcomes.flatMap(outcome=>outcome?.items||[]).filter(item=>!mistakesOnly||!item.correct);
  if(!items.length)return;
  const list=document.createElement('ul');list.className='answer-review';list.setAttribute('aria-label','Corrección de respuestas');
  items.forEach(item=>{
    const row=document.createElement('li');row.dataset.result=item.correct?'correct':'incorrect';
    const title=document.createElement('strong');title.textContent=`${item.correct?'✓':'✕'} ${item.label}`;
    const detail=document.createElement('span');
    detail.textContent=item.correct?'Correcto':item.detail||`Tu respuesta: ${item.given||'sin respuesta'}. Correcta: ${item.answer}.`;
    row.append(title,detail);list.append(row);
    if(item.key) {
      const select=container.querySelector(`[data-answer-key="${item.key}"]`);
      if(select) {select.closest('label').dataset.result=row.dataset.result;select.setAttribute('aria-invalid',String(!item.correct));}
    }
  });
  host.append(list);
}
