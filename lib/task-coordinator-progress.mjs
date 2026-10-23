const day=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
export function progressSnapshot(state,now=new Date().toISOString()){
 const at=Date.parse(now);if(!Number.isFinite(at)||!state?.control||!state.tasks||!Array.isArray(state.events))throw Error('Verified state required');
 const roles={};for(const t of Object.values(state.tasks)){
  const id=t.plan?.agentId;if(!id)continue;const r=roles[id]??={working:0,queued:0,awaitingAudit:0,completed:0,exceptions:0};
  if(t.status==='Working'&&!state.control.paused&&!state.control.roles?.[id]?.paused&&t.lease?.epoch===state.control.epoch&&Date.parse(t.lease.until)>at)r.working++;
  else if(t.status==='Working')r.exceptions++;
  if(t.status==='Queued')r.queued++;if(t.status==='Awaiting audit')r.awaitingAudit++;if(t.status==='Completed')r.completed++;
  if(['Failed','Uncertain','Needs reconciliation','Needs correction'].includes(t.status))r.exceptions++;
 }
 const buckets={};for(const e of state.events){if(!e.taskId||!Number.isFinite(Date.parse(e.at))||Date.parse(e.at)>at)continue;const date=day(e.at),b=buckets[date]??={date,started:0,completed:0,awaitingAudit:0,exceptions:0};if(e.type==='Working')b.started++;if(e.type==='Completed')b.completed++;if(e.type==='Awaiting audit')b.awaitingAudit++;if(['Failed','Uncertain','Needs reconciliation','Needs correction'].includes(e.type))b.exceptions++;}
 return{checkedAt:now,day:day(now),paused:state.control.paused,rolePauses:Object.fromEntries(Object.entries(state.control.roles||{}).map(([id,r])=>[id,!!r.paused])),roles,daily:Object.values(buckets).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30)};
}
export function departmentStatus(p,ids,now=Date.now()){
 if(!p||!Number.isFinite(Date.parse(p.checkedAt))||now-Date.parse(p.checkedAt)>30000||now<Date.parse(p.checkedAt)-60000)return'Connection unverified';
 if(p.paused)return'Paused by CEO';if(ids.length&&ids.every(id=>p.rolePauses[id]))return'Paused by CEO';
 const rows=ids.map(id=>p.roles[id]).filter(Boolean);if(rows.some(r=>r.working>0))return'Active · verified task';if(rows.some(r=>r.exceptions>0))return'Review required';if(rows.some(r=>r.awaitingAudit>0))return'Awaiting audit';if(rows.some(r=>r.queued>0))return'Ready queue · awaiting execution';if(rows.some(r=>r.completed>0))return'Idle · completed work recorded';return'Awaiting first verified task';
}
