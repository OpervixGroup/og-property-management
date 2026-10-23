import path from 'node:path';
import {learningCycle,privateLearningFiles} from './cycle.mjs';
import {createLearningModel} from './model.mjs';
import {learningDigest} from '../../lib/client-learning.mjs';
// Called only by the existing cloud controller while it owns cycle.lock.
export async function runClientLearning({root,activation,raw,app,signal,cycleStartedAt,corporateStatus,now=()=>Date.now()}){
 if(!['Completed','Already checked','Standby'].includes(corporateStatus))return {status:'Standby',reason:'Corporate attempt unresolved'};
 if(activation.clientLearningEnabled!==true)return {status:'Standby',reason:'Client learning cutover not enabled'};
 if(!Number.isFinite(cycleStartedAt)||now()-cycleStartedAt>12*60000)return {status:'Standby',reason:'Insufficient time before existing host timeout'};
 const deadline=cycleStartedAt+24*60000;
 return learningCycle({api:(operation,input)=>raw(operation,input,{allowCanceled:operation==='learningHeld'}),app,model:createLearningModel(),filesFor:privateLearningFiles(path.join(root,'client-contexts')),digest:learningDigest,signal,deadline});
}
