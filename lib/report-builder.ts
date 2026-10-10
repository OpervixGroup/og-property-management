import type {ReportTable} from './report-center';
export type ReportFilter={column:string;operator:'contains'|'equals'|'not-equals'|'greater'|'less';value:string};
export function reportNumber(value:string){const s=value.trim();if(!/^\(?-?\$?[\d,]+(?:\.\d+)?\)?$/.test(s))return null;const n=Number(s.replace(/[$,()]/g,''))*(s.includes('(')?-1:1);return Number.isFinite(n)?n:null;}
export function buildReport(table:ReportTable,filters:ReportFilter[],group:string,total:string){
 if(filters.length>10)throw Error('Use up to 10 report filters');
 for(const f of filters)if(!table.headers.includes(f.column)||!['contains','equals','not-equals','greater','less'].includes(f.operator)||typeof f.value!=='string'||f.value.length>200)throw Error('Choose valid report filters');
 const indexes=filters.map(f=>table.headers.indexOf(f.column));
 const records=table.rows.map((values,i)=>({values,unitId:table.unitIds[i]})).filter(r=>filters.every((f,i)=>{const v=r.values[indexes[i]],a=v.toLowerCase(),b=f.value.toLowerCase();if(f.operator==='contains')return a.includes(b);if(f.operator==='equals')return a===b;if(f.operator==='not-equals')return a!==b;const x=reportNumber(v),y=reportNumber(f.value);return x!==null&&y!==null&&(f.operator==='greater'?x>y:x<y);}));
 if(!group){if(total)throw Error('Choose a group before adding a total');return {...table,rows:records.map(r=>r.values),unitIds:records.map(r=>r.unitId)};}
 const gi=table.headers.indexOf(group),ti=table.headers.indexOf(total);if(gi<0||total&&ti<0||group===total||total.toLowerCase().includes('repeated'))throw Error('Choose valid grouping and total columns');
 const groups=new Map<string,{count:number;cents:number;currency:boolean}>();
 for(const r of records){const key=r.values[gi]||'Not recorded',g=groups.get(key)??{count:0,cents:0,currency:false};g.count++;if(total){const v=reportNumber(r.values[ti]);if(v===null)throw Error('Every matching value in the total column must be numeric');const cents=Math.round(v*100);if(Math.abs(v*100-cents)>.00001)throw Error('Totals support up to two decimal places');g.cents+=cents;g.currency ||= r.values[ti].includes('$');if(!Number.isSafeInteger(g.cents))throw Error('Total exceeds the supported range');}groups.set(key,g);}
 return {headers:[group,'Record count',...(total?['Total '+total]:[])],rows:[...groups].map(([key,g])=>[key,String(g.count),...(total?[(g.currency?'$':'')+(g.cents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})]:[])]),unitIds:[...groups].map(()=>''),note:table.note+' Grouped results count matching source rows; repeated document totals should not be summed.'};
}
