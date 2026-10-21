'use client';
import {useMemo} from 'react';
import {nextScheduledSlot,countdownText,scheduleTimeZone} from '@/lib/hq-schedule.mjs';
const dateFormatter=new Intl.DateTimeFormat('en-US',{timeZone:scheduleTimeZone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
export default function NextWorkCountdown({now,paused}:{now:Date|null;paused:boolean|null}){
 const timestamp=now?.getTime()??null,minute=timestamp===null?null:Math.floor(timestamp/60000);
 // Recalculate only at a minute boundary; reuse the headquarters' existing clock.
 const slots=useMemo(()=>minute===null?null:{work:nextScheduledSlot(minute*60000,60),check:nextScheduledSlot(minute*60000,30)},[minute]);
 const work=slots?.work,check=slots?.check;
 return <section className="hq-next-work" aria-labelledby="next-work-title">
  <div><p className="hq-kicker" id="next-work-title">NEXT HOURLY WORK WINDOW</p><strong className="hq-countdown" role="timer" aria-label="Time until next hourly work window">{timestamp!==null&&work?countdownText(work-timestamp):'—'}</strong><p>{work?dateFormatter.format(work):'Loading schedule…'}</p></div>
  <div><h2>Your next headquarters check</h2><p>Next intake check: <b>{check?dateFormatter.format(check):'Loading…'}</b>{timestamp!==null&&check?` · in ${countdownText(check-timestamp)}`:''}</p><p>Weekdays, 8:00 a.m.–5:00 p.m. Chicago. Intake checks every 30 minutes; broader work at most once per hour.</p><p className="hq-schedule-state">{paused===true?'CEO pause is active. Scheduled checks do not authorize work.':paused===false?'CEO controls currently permit reviewed work. Each task still needs its execution checks.':'CEO pause state unavailable. Execution cannot be confirmed.'}</p><p className="hq-profile-note">Planned timing, not proof of execution. The local computer, app and connection must be available. Schedule reference verified October 21, 2026; update this display if the schedule changes. Check the execution log for actual results.</p></div>
 </section>;
}
