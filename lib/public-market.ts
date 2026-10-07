export const marketSeries = [
  {id:'SP500',title:'Stock market',label:'S&P 500',unit:'index',frequency:'Daily close',source:'S&P Dow Jones Indices via FRED',maxAge:7},
  {id:'MORTGAGE30US',title:'Mortgage rates',label:'30-year fixed mortgage',unit:'percent',frequency:'Weekly national average',source:'Freddie Mac via FRED',maxAge:21},
  {id:'ATNHPIUS41700Q',title:'San Antonio housing',label:'House price index',unit:'index',frequency:'Quarterly · San Antonio–New Braunfels',source:'FHFA via FRED',maxAge:240},
] as const;
export type MarketObservation={id:string;value:number|null;date:string|null;change:number|null;status:'available'|'stale'|'unavailable'};
export function parseObservation(id:string,csv:string,maxAge:number,now=new Date()):MarketObservation {
  const lines=csv.trim().split(/\r?\n/);if(lines[0]!==`observation_date,${id}`&&lines[0]!==`DATE,${id}`)throw Error('Unexpected market feed');
  const today=now.toISOString().slice(0,10);
  const rows=lines.slice(1).flatMap(line=>{const [date,raw]=line.split(',');const value=Number(raw);return /^\d{4}-\d{2}-\d{2}$/.test(date)&&new Date(date).toISOString().slice(0,10)===date&&date<=today&&raw?.trim()&&Number.isFinite(value)&&value>0?[{date,value}]:[];}).sort((a,b)=>a.date.localeCompare(b.date));
  const last=rows.at(-1),previous=rows.at(-2);if(!last)throw Error('No valid observations');
  return {id,...last,change:previous?last.value-previous.value:null,status:(now.getTime()-Date.parse(last.date))/86400000>maxAge?'stale':'available'};
}
export async function loadMarket(fetcher:typeof fetch=fetch){
  const observations=await Promise.all(marketSeries.map(async s=>{try{const r=await fetcher(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}`,{signal:AbortSignal.timeout(10000),next:{revalidate:3600}});if(!r.ok)throw Error('Feed unavailable');return parseObservation(s.id,await r.text(),s.maxAge);}catch{return {id:s.id,value:null,date:null,change:null,status:'unavailable'} as MarketObservation;}}));
  return {retrievedAt:new Date().toISOString(),observations};
}
