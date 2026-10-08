export const PORTAL_CENTS=999,UNIT_CENTS=110;
export type SubscriptionStatus='Pending activation'|'Active'|'Paused'|'Cancelled';
export function subscriptionTotal(activeUnits:number){if(!Number.isSafeInteger(activeUnits)||activeUnits<0||activeUnits>100000)throw Error('Invalid active unit count');return PORTAL_CENTS+UNIT_CENTS*activeUnits;}
export function money(cents:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
export function billingMonth(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);}
