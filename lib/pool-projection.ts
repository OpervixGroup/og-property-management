import type {Data} from './pool';
import {isParticipating,latest} from './pool';
import {monthlyFeeSummary} from './fee-summary';
import {expectedUnitRent} from './tenancy';
import {tenantRentProgress} from './rent-progress';
export function poolProjection(d:Data,period:string,poolId:string){
 const setting=d.settings.filter(s=>s.period===period&&s.poolId===poolId).sort((a,b)=>b.version-a.version)[0];if(!setting)return null;
 const units=d.units.filter(u=>u.poolId===poolId&&isParticipating(d,u,period));
 const groups=([1,2] as const).map(type=>{const count=units.filter(u=>u.type===type).length;const allocation=type===1?setting.rent1:setting.rent2,management=type===1?setting.management1:setting.management2,maintenance=type===1?setting.maintenance1:setting.maintenance2,hoa=type===1?setting.hoa1:setting.hoa2;return {type,count,allocation,management,maintenance,hoa};});
 const sum=(key:'allocation'|'management'|'maintenance'|'hoa')=>groups.reduce((n,g)=>n+g.count*g[key],0);
 const allocated=sum('allocation'),management=sum('management'),maintenance=sum('maintenance'),hoa=sum('hoa'),electricity=setting.electricTotal;
 const fees=management+maintenance,owners=electricity===null?null:allocated-fees-hoa-electricity;
 const rent=tenantRentProgress({...d,units:d.units.filter(u=>u.poolId===poolId)},period);const nextPeriod=new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5)),1)).toISOString().slice(0,7);const next=tenantRentProgress({...d,units:d.units.filter(u=>u.poolId===poolId)},nextPeriod);
 const capacity=(expected:number)=>owners===null?null:expected-owners-hoa-electricity!;
 const currentCapacity=capacity(rent.expected),nextCapacity=capacity(next.expected),collectedCapacity=capacity(rent.applied);
 const statements=latest(d,period).filter(s=>d.units.some(u=>u.id===s.unitId&&u.poolId===poolId));const statementFees=monthlyFeeSummary(statements);const statementAllocated=statements.reduce((n,s)=>n+s.allocated,0);const deductions=statements.reduce((n,s)=>n+s.expenses.reduce((a,e)=>a+e.cents,0),0);const credits=statements.reduce((n,s)=>n+(s.credits??[]).reduce((a,e)=>a+e.cents,0),0);const otherCosts=deductions-statementFees.fees-statementFees.hoa-statementFees.electricity-credits;const ownerNet=statementAllocated-deductions+credits;const projectedOffice=rent.expected-ownerNet-statementFees.hoa-statementFees.electricity-otherCosts;const nextOffice=next.expected-ownerNet-statementFees.hoa-statementFees.electricity-otherCosts;const missingRent=d.units.filter(u=>u.poolId===poolId&&expectedUnitRent(d,u,period).cents===null).map(u=>({number:u.number,participating:isParticipating(d,u,period),review:expectedUnitRent(d,u,period).review}));
 return {statements,statementFees,statementAllocated,deductions,credits,otherCosts,ownerNet,projectedOffice,nextOffice,missingRent,groups,allocated,management,maintenance,fees,hoa,electricity,owners,rent,next,nextPeriod,currentCapacity,nextCapacity,collectedCapacity,currentGap:allocated-rent.expected,nextGap:allocated-next.expected,target:1000000,shortfall:currentCapacity===null?null:Math.max(0,1000000-currentCapacity)};
}

