import type {ChatGPTUser} from '@/app/chatgpt-auth';
import {managers} from '@/lib/access-policy';
export function sameOrigin(request:Request){const configured=process.env.OG_APP_URL;if(!configured||request.headers.get('origin')!==new URL(configured).origin)throw Error('Invalid request origin');}
export function access(user:ChatGPTUser|null,roles?:string[]){if(!user||user.mustChangePassword||roles&&!roles.includes(user.role))throw Error('Access denied');return user;}
export function fullAccess(user:ChatGPTUser|null,write=false){const u=access(user);if(write?!managers(u.role):!['Global Admin','Management','Accountant','External CPA'].includes(u.role))throw Error('Access denied');return u;}
export async function body(request:Request,limit=6000){const text=await request.text();if(text.length>limit)throw Error('Request is too large');return JSON.parse(text);}
export function password(value:unknown){if(typeof value!=='string'||value.length<12||value.length>128)throw Error('Use a password of 12–128 characters');return value;}
