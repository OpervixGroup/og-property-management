'use client';

import {useMemo,useState} from 'react';

import type {Data} from '@/lib/pool';

import {money} from '@/lib/pool';

import {monthlyProfitability,type RentBasis} from '@/lib/profitability';

import {Grid,Pick} from './report-controls';

export const profitabilityTabs=['Executive Summary','Assumptions','Pool Rent & Owner Distributions','Monthly Profitability Analysis','DLA Operating Expenses'];

function Waterfall({steps}:{steps:readonly (readonly [string,number|null])[]}){

 if(steps.some(([,v])=>v===null))return <p className="notice">Complete the missing inputs to display the full waterfall. Known amounts are shown below.</p>;

 let running=0;

 const bars=steps.map(([label,value],i)=>{const total=i===0||i===5||i===7,start=total?0:running,end=total?value!:running+value!;running=end;return {label,start,end,total,value:value!};});

 const low=Math.min(0,...bars.flatMap(b=>[b.start,b.end])),high=Math.max(1,...bars.flatMap(b=>[b.start,b.end])),y=(v:number)=>35+(high-v)/(high-low)*230;

 return <svg role="img" aria-label="DLA monthly income waterfall; exact amounts listed below" viewBox="0 0 880 380" style={{width:'100%',height:'auto'}}><line x1="20" x2="860" y1={y(0)} y2={y(0)} stroke="#bdcbd9"/>{bars.map((b,i)=><g key={b.label}><rect x={25+i*106} y={Math.min(y(b.start),y(b.end))} width="72" height={Math.max(2,Math.abs(y(b.end)-y(b.start)))} fill={b.total?'#164b75':b.value<0?'#ba554c':'#32806c'}/><text x={61+i*106} y={Math.min(y(b.start),y(b.end))-8} textAnchor="middle" fontSize="11" fill="#163957">{money(b.value)}</text><text x={61+i*106} y="300" textAnchor="middle" fontSize="11" fill="#163957">{['Tenant rent','Rent pool','MAINT','MGT','Electric','DLA Income','Op. expenses','DLA result'][i]}</text></g>)}</svg>;

}

export default function ProfitabilityPanel({data,period,tab,navigate,onClassifications}:{data:Data;period:string;tab:string;navigate:(s:string)=>void;onClassifications:()=>void}){

 const [poolId,setPoolId]=useState(''),[basis,setBasis]=useState<RentBasis>('Contract rent');

 const selected=data.pools.find(p=>p.id===poolId)??data.pools[0];

 const report=useMemo(()=>selected?monthlyProfitability(data,period,selected.id,basis):null,[data,period,selected?.id,basis]);

 if(!report||!selected)return <section className="panel">Add a rental pool to begin.</section>;

 const r=report,amount=(n:number|null)=>n===null?'Needs review':money(n),status=r.complete?'Provisional · calculated from saved records':'Incomplete · '+r.missing+' unit(s) need review';

 const waterfall=[['Tenant rent',r.totals.rent],['Rent pool',-r.totals.pool],['MAINT fee',-r.totals.maintenance],['MGT fee',-r.totals.management],['Pool electric',-r.totals.electricity],['DLA Income total',r.complete?r.totals.contribution:null],['Additional reviewed operating expenses',-r.operatingExpenses],['DLA operating result',r.net]] as const;

 return <><section className="panel"><div className="panel-heading"><div><p className="eyebrow">DEVONSHIRE MANAGEMENT</p><h3>Devonshire Leasing Agency — Monthly Profitability Analysis</h3><p>{period} · {selected.name}</p></div><span className="badge pending">{status}</span></div><div className="toolbar"><Pick label="Profitability pool" value={selected.id} onChange={setPoolId} items={data.pools.map(p=>({value:p.id,label:p.name}))}/><Pick label="Rent calculation basis" value={basis} onChange={v=>setBasis(v as RentBasis)} items={['Contract rent','Actual collected'].map(v=>({value:v,label:v}))}/></div><p className="hint">{basis==='Contract rent'?'Contract rent is a planning basis. Lease rates and dates require verification; it is not cash received.':'Actual collected uses matched receipts or saved manual office rent for this month.'} Gross allocated pool rent is deducted before fees, as requested; it is separate from the net owner distribution. Missing inputs do not become zero.</p></section>

 {tab==='Executive Summary'&&<><div className="ops-metrics">{[['Active pool units',String(r.rows.length)],['Tenant rent · known amounts',money(r.totals.rent)],['DLA Income total',amount(r.complete?r.totals.contribution:null)],['DLA result · reviewed expenses',amount(r.net)]].map(([label,value])=><div className="ops-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="panel"><h3>Monthly close review</h3><Grid headers={['Review','Status','Next step']} rows={[["Assumptions",r.setting?'Version '+r.setting.version:'Missing','Review monthly settings'],['Pool allocation',r.allocationUnverified?'Needs review':'Saved reviewed allocation','Review Accounting → Pool allocation & contracts'],['Rent completeness',r.missing+' incomplete calculation(s)','Review tenant profiles and collection records'],['Operating classifications',r.unclassified+' unclassified source line(s)','Review Agency income & payables'],['Owner distributions','Recorded cash paid: '+money(r.totals.paid),'Review approvals and external payment references']]}/><p className="hint">Known-amount subtotals are partial where inputs are missing. Results remain provisional while statements, lease rates, or operating classifications need review.</p></section></>}

 {tab==='Assumptions'&&<section className="panel"><div className="panel-heading"><h3>Monthly assumptions · {period}</h3><button onClick={()=>navigate('settings')}>Review / edit monthly settings</button></div><Grid headers={['Driver','1 bed / 1 bath','2 bed / 2 bath']} rows={r.setting?[["Allocated pool rent",money(r.setting.rent1),money(r.setting.rent2)],['Management fee',money(r.setting.management1),money(r.setting.management2)],['Maintenance fee',money(r.setting.maintenance1),money(r.setting.maintenance2)],['HOA',money(r.setting.hoa1),money(r.setting.hoa2)]]:[]}/><p>Electricity total: {amount(r.setting?.electricTotal??null)} · {r.setting?.electricConfirmed?'Verified':'Needs review'}</p><p>Active roster: {r.rows.length} units · settings version {r.setting?.version??'not entered'}</p><p>{r.setting?.notes||'No assumption source notes entered.'}</p><p className="hint">This view reads the existing monthly settings. Effective contracts can override standard fees on individual statements. Use Pool allocation & contracts for reviewed expected-rent allocation and contract sources.</p></section>}

 {tab==='Pool Rent & Owner Distributions'&&<section className="panel"><div className="panel-heading"><h3>Pool rent and owner distributions · {period}</h3><button onClick={()=>navigate('distributions')}>Review owner distribution proposals</button></div><Grid headers={['Unit','Owner','Gross pool rent','Current-month owner net','Balance available incl. carryforward','Recorded cash paid','Statement status']} rows={r.rows.map(x=>[x.unit,x.owner,amount(x.pool),amount(x.ownerNet),amount(x.ownerBalance),money(x.paid),x.status])}/><p className="hint">Current-month owner net includes all statement deductions and credits. Balance available also includes opening balance and adjustments. Recorded payments require an external payment reference; this report initiates no payments.</p></section>}

 {tab==='Monthly Profitability Analysis'&&<><section className="panel"><h3>DLA monthly waterfall · {period}</h3><Waterfall steps={waterfall}/><div aria-label="Monthly profitability waterfall">{waterfall.map(([label,value],i)=><div className="summary-line" key={label} style={{borderTop:i===5||i===7?'2px solid #c8d8e8':undefined,padding:'12px 0'}}><span>{i>0&&i<5?'− ':''}{label}</span><strong>{amount(value)}</strong></div>)}</div><p className="hint">The requested DLA Income calculation is rent − gross pool rent − MAINT − MGT − pool electricity. Additional reviewed expenses are shown after that subtotal. This management analysis does not replace a confirmed financial statement.</p></section><section className="panel"><h3>Unit calculation detail</h3><Grid headers={['Unit','Tenant','Tenant rent','Rent pool','MAINT','MGT','Pool electric','DLA Income','Review']} rows={r.rows.map(x=>[x.unit,x.tenant,amount(x.rent),amount(x.pool),amount(x.maintenance),amount(x.management),amount(x.electricity),amount(x.contribution),x.issues.join(' · ')||'Saved inputs'])}/></section></>}

 {tab==='DLA Operating Expenses'&&<section className="panel"><div className="panel-heading"><h3>DLA operating expenses · {period}</h3><button onClick={onClassifications}>Review expense classifications</button></div><div className="summary-line"><span>Additional reviewed operating expenses</span><strong>{money(r.operatingExpenses)}</strong></div><Grid headers={['Date','Source','Description','Recipient','GL / QBO account','Amount','Payment state']} rows={r.expenses.map(e=>[e.date,e.unit,e.description,e.recipient,e.gl+' / '+e.accountName,money(e.cents),e.paymentState])}/>{!r.expenses.length&&<p>No additional reviewed operating expenses are recorded for this month.</p>}<p className="hint">Only sources classified as Expense are included. Standard MAINT, MGT, and pool electricity are already deducted in the waterfall and are excluded here to prevent a second deduction. {r.unclassified} unclassified source lines still require review. Shared inventory costs are workspace-wide and need a pool-specific allocation before they can be treated as a confirmed pool expense.</p></section>}

 </>;

}

