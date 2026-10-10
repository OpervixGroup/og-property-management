import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../lib/public-weather.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {loadForecast}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
let calls=0;
const valid={properties:{updateTime:'2026-10-09T20:00:00Z',periods:[{name:'Tonight',startTime:'2026-10-09T18:00:00-05:00',temperature:72,temperatureUnit:'F',shortForecast:'Clear',windSpeed:'5 mph'}]}};
const result=await loadForecast('san-juan',async(url,opts)=>{calls++;assert.match(opts.headers['User-Agent'],/OGPropertyManagement/);return Response.json(calls===1?{properties:{forecast:'https://api.weather.gov/gridpoints/SJU/1,1/forecast'}}:valid);});
assert.equal(result.city,'San Juan, Puerto Rico');assert.equal(result.periods[0].temperature,72);assert.equal(calls,2);
await assert.rejects(loadForecast('unsupported',()=>{throw Error('Must not fetch');}),/supported city/);
await assert.rejects(loadForecast('miami',async()=>Response.json({properties:{forecast:'https://evil.example/secret'}})),/Invalid forecast source/);
await assert.rejects(loadForecast('miami',async()=>new Response('',{status:503})),/temporarily unavailable/);
calls=0;await assert.rejects(loadForecast('miami',async()=>Response.json(++calls===1?{properties:{forecast:'https://api.weather.gov/gridpoints/MFL/1,1/forecast'}}:{properties:{periods:[]}})),/temporarily unavailable/);
console.log('PASS forecast retrieval, Puerto Rico, invalid city, source allowlist, outage and empty forecast');

