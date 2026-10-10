import {NextResponse} from 'next/server';
import {loadForecast,weatherCities,type PublicForecast} from '@/lib/public-weather';
export const runtime='nodejs';
const cache=new Map<string,{until:number;value:PublicForecast}>();
const pending=new Map<string,Promise<PublicForecast>>();
export async function GET(request:Request){
 const city=new URL(request.url).searchParams.get('city')??'';
 if(!weatherCities.some(c=>c.id===city))return NextResponse.json({error:'Choose a supported city'},{status:400});
 try{let value=cache.get(city)?.until!>Date.now()?cache.get(city)!.value:undefined;if(!value){let task=pending.get(city);if(!task){task=loadForecast(city).then(result=>{cache.set(city,{until:Date.now()+600000,value:result});return result;}).finally(()=>pending.delete(city));pending.set(city,task);}value=await task;}return NextResponse.json(value,{headers:{'Cache-Control':'public, max-age=300'}});}catch{return NextResponse.json({error:'Forecast temporarily unavailable. Visit weather.gov for current information.'},{status:503});}
}
