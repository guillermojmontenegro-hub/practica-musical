// Pure aggregation keeps filtering, charts and error ranking consistent.
export function dayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function summarize(attempts, stats, {days=30,mode='all',now=Date.now()}={}) {
  const start=new Date(now); start.setHours(0,0,0,0);
  if(days!=='all') start.setDate(start.getDate()-Number(days)+1);
  const filtered=attempts.filter(item=>(mode==='all'||item.mode===mode)&&(days==='all'||item.time>=start.getTime()));
  const rows=Object.entries(stats).filter(([id])=>mode==='all'||mode===id);
  const total=days==='all' ? rows.reduce((sum,[,r])=>sum+(r.total||0),0) : filtered.length;
  const right=days==='all' ? rows.reduce((sum,[,r])=>sum+(r.right||0),0) : filtered.filter(item=>item.correct).length;
  const credit=days==='all' ? rows.reduce((sum,[,r])=>sum+(r.credit??r.right??0),0) : filtered.reduce((sum,r)=>sum+r.credit,0);
  const daily=new Map();
  const chartDays=days==='all' ? 30 : Number(days);
  for(let i=chartDays-1;i>=0;i--) { const d=new Date(now);d.setDate(d.getDate()-i);daily.set(dayKey(d),{date:dayKey(d),total:0,right:0}); }
  const errors=new Map();
  for(const item of filtered) {
    const day=daily.get(dayKey(item.time));
    if(day) {day.total++;day.right+=Number(item.correct);}
    for(const failure of item.errors||[]) {
      const key=`${item.mode}:${failure}`;
      const row=errors.get(key)||{mode:item.mode,label:failure,count:0};
      row.count++;errors.set(key,row);
    }
  }
  const byMode=Object.fromEntries(rows.map(([id,r])=>{
    const recent=filtered.filter(item=>item.mode===id);
    const count=days==='all' ? r.total||0 : recent.length;
    const correct=days==='all' ? r.right||0 : recent.filter(item=>item.correct).length;
    return [id,{total:count,right:correct,wrong:count-correct,accuracy:count ? Math.round(correct/count*100):null}];
  }));
  const midpoint=new Date(now);midpoint.setDate(midpoint.getDate()-7);midpoint.setHours(0,0,0,0);
  const previous=new Date(midpoint);previous.setDate(previous.getDate()-7);
  const week=filtered.filter(a=>a.time>=midpoint.getTime());
  const lastWeek=filtered.filter(a=>a.time>=previous.getTime()&&a.time<midpoint.getTime());
  const rate=list=>list.filter(a=>a.correct).length/list.length*100;
  return {total,right,wrong:total-right,credit,accuracy:total?Math.round(right/total*100):null,
    daily:[...daily.values()],byMode,filtered,
    errors:[...errors.values()].sort((a,b)=>b.count-a.count).slice(0,8),
    change:week.length&&lastWeek.length ? Math.round(rate(week)-rate(lastWeek)):null,
    activeDays:new Set(filtered.map(a=>dayKey(a.time))).size};
}
