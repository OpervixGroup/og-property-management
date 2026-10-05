'use client';
import type {Data} from '@/lib/pool';
import {money} from '@/lib/pool';
import {tenantRentProgress} from '@/lib/rent-progress';

export default function RentProgress({data,period,compact=false,navigate}:{data:Data;period:string;compact?:boolean;navigate?:()=>void}){
 const r=tenantRentProgress(data,period),month=new Date(period+'-01T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'long',year:'numeric'});
 return <section className={'tenant-rent-progress'+(compact?' compact':'')} aria-label={'Tenant rent progress for '+month}>
  <div className="rent-progress-heading"><div><span>Tenant rent applied · {month}</span><strong>{money(r.applied)}</strong></div>{navigate&&<button className="secondary" onClick={navigate}>Review rent receipts</button>}</div>
  <progress aria-label="Tenant rent collection progress" max={100} value={r.percent??0}/>
  <div className="rent-progress-details"><span>Expected <b>{money(r.expected)}</b></span><span>Still to collect <b>{money(r.remaining)}</b></span><span>{r.percent===null?'Progress unavailable':r.percent.toFixed(1)+'% collected'}</span></div>
  <p>Includes prepaid receipts applied to this month’s rent. Excludes escrow, credits and unapplied payments.{r.needsReview>0?' '+r.needsReview+' units need rent review; expected total is incomplete.':''}</p>
 </section>;
}
