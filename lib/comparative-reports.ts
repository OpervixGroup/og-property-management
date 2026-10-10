import type {Data} from './pool';
import {money} from './pool';
import {monthBounds} from './tenancy';
import {nativeReport} from './accounting-tools';
import {native} from './native-accounting';
export const comparativeReportNames=['Balance sheet - comparative','Income statement - comparative','Income statement - 12 month'] as const;
export type ComparativeName=typeof comparativeReportNames[number];
export function previousMonth(period:string){monthBounds(period);const [y,m]=period.split('-').map(Number);return new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);}
export function comparativeReport(d:Data,bookId:string,name:ComparativeName,period:string){
 const {last:end}=monthBounds(period),book=native(d).books.find(b=>b.id===bookId);
 if(!book||!comparativeReportNames.includes(name))throw Error('Choose a valid company ledger and report');
 const income=name!=='Balance sheet - comparative',periods=name==='Income statement - 12 month'?Array.from({length:12},(_,i)=>{const [y,m]=period.split('-').map(Number);return new Date(Date.UTC(y,m-12+i,1)).toISOString().slice(0,7);}):[previousMonth(period),period];
 if(end<book.openingDate)throw Error('Report period precedes the verified ledger opening');
 const samples=periods.map(p=>{const {last}=monthBounds(p);return last<book.openingDate?null:nativeReport(d,bookId,income?'Income statement':'Balance sheet',p+'-01',last);});
 const keys=[...new Set(samples.flatMap(rows=>rows?.map(r=>r.accountKey||'earnings')??[]))];
 const rows=keys.map(key=>{const record=samples.flatMap(r=>r??[]).find(r=>(r.accountKey||'earnings')===key)!;const values=samples.map(sample=>sample===null?null:sample.find(r=>(r.accountKey||'earnings')===key)?.balance??0);return {key,label:record.label,values,change:values.length===2&&values.every(v=>v!==null)?values[1]!-values[0]!:null};});
 return {periods,headers:['Account',...periods,...(periods.length===2?['Change']:[])],rows:rows.map(r=>[r.label,...r.values.map(v=>v===null?'Before ledger opening':money(v)),...(periods.length===2?[r.change===null?'Unavailable':money(r.change)]:[])]),raw:rows,note:'Posted OG ledger only. Debit-positive accounting signs; credits appear negative. Periods before the verified opening are unavailable, not zero. Current account labels are used.'};
}
