import type {Data} from './pool';
export function validateSharedRecordHistory(old:Data,next:Data){
 for(const key of ['properties','pools','owners','periods'] as const)for(const r of old[key])if(!next[key].some(n=>n.id===r.id))throw Error('Preserve '+key+' history; archive records instead');
 for(const r of old.pools){const n=next.pools.find(n=>n.id===r.id)!;if(n.propertyId!==r.propertyId)throw Error('Pool property identity is immutable');}
 for(const r of old.units){const n=next.units.find(n=>n.id===r.id);if(n&&(n.propertyId!==r.propertyId||n.poolId!==r.poolId))throw Error('Unit property and pool identities are immutable');}
 for(const r of old.periods)if(next.periods.find(n=>n.id===r.id)?.month!==r.month)throw Error('Accounting period identity is immutable');
 for(const p of next.periods)if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month)||next.periods.filter(n=>n.month===p.month).length!==1)throw Error('Invalid or duplicate accounting month');
 for(const p of next.pools)if(!next.properties.some(n=>n.id===p.propertyId))throw Error('Pool references an unknown property');
 for(const unit of next.units)if(!next.pools.some(p=>p.id===unit.poolId&&p.propertyId===unit.propertyId)||!next.owners.some(o=>o.id===unit.ownerId))throw Error('Unit references an unknown pool, property or owner');
}
