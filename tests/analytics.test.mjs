import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, dayKey } from '../src/analytics.mjs';
import { transcriptionErrors } from '../src/diagnostics.mjs';
const now=new Date(2026,10,14,12).getTime();
const ago=days=>{const date=new Date(now);date.setDate(date.getDate()-days);return date.getTime();};
const attempts=[
 {time:ago(1),mode:'scales',correct:false,credit:0,errors:['Confusión de escala']},
 {time:ago(2),mode:'scales',correct:false,credit:0,errors:['Confusión de escala']},
 {time:ago(8),mode:'scales',correct:true,credit:1,errors:[]},
 {time:ago(1),mode:'chords',correct:true,credit:1,errors:[]},
];
const stats={scales:{total:20,right:12},chords:{total:10,right:9,credit:8.5}};
test('all-time totals preserve legacy data while dated history provides errors and trend',()=>{
 const data=summarize(attempts,stats,{days:'all',now});
 assert.equal(data.total,30);assert.equal(data.right,21);assert.equal(data.credit,20.5);
 assert.equal(data.errors[0].count,2);assert.equal(data.daily.length,30);
 assert.equal(data.change,-67);assert.equal(data.activeDays,3);
});
test('period and exercise filters apply to counters, activity and errors',()=>{
 const data=summarize(attempts,stats,{days:7,mode:'scales',now});
 assert.equal(data.total,2);assert.equal(data.right,0);assert.equal(data.byMode.scales.wrong,2);
 assert.equal(data.daily.reduce((sum,r)=>sum+r.total,0),2);
 assert.equal(data.errors.length,1);assert.equal(data.filtered.length,2);
 assert.equal(data.change,null);
});
test('local calendar days handle midnight boundaries and empty histories',()=>{
 const time=new Date(2026,10,14,0,1).getTime();
 assert.equal(dayKey(time),'2026-11-14');
 const data=summarize([],{}, {now});assert.equal(data.accuracy,null);assert.equal(data.errors.length,0);
});
test('transcription errors distinguish pitch, duration, grouping and ties',()=>{
 const errors=transcriptionErrors([[{pitch:2,length:1,tie:true,tuplet:{size:3}}]],[[{pitch:4,length:2}]],{rhythm:true});
 assert.deepEqual(errors,['Alturas de las notas','Duración de las figuras','Ligaduras y síncopas','Grupos irregulares']);
 assert.deepEqual(transcriptionErrors([[]],[[{pitch:4,length:2}]]),['Cantidad de notas o ataques']);
});
