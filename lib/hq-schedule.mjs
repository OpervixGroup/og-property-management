// Display-only schedule reference. This module never starts or authorizes work.
export const scheduleTimeZone='America/Chicago';
const partsFormatter=new Intl.DateTimeFormat('en-US',{timeZone:scheduleTimeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
/** @param {number} now @param {30|60} cadenceMinutes */
export function nextScheduledSlot(now,cadenceMinutes=60){
 if(!Number.isFinite(now)||![30,60].includes(cadenceMinutes))return null;
 // Chicago's UTC offsets are whole hours; checking UTC half-hours also handles DST.
 const step=30*60000,start=Math.floor(now/step)*step+step;
 for(let at=start;at<=start+8*86400000;at+=step){
  const p=Object.fromEntries(partsFormatter.formatToParts(at).map(x=>[x.type,x.value]));
  const hour=Number(p.hour),minute=Number(p.minute);
  if(!['Sat','Sun'].includes(p.weekday)&&hour>=8&&hour<17&&minute%cadenceMinutes===0)return at;
 }
 return null;
}
/** @param {number} milliseconds */
export function countdownText(milliseconds){
 if(!Number.isFinite(milliseconds))return '—';
 const seconds=Math.max(0,Math.ceil(milliseconds/1000));
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
