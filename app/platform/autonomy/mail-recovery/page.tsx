import {platformOwner} from '@/lib/server/platform';
import Recovery from './recovery';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await platformOwner();if(!process.env.OG_CEO_AUTH_ID||owner?.authId!==process.env.OG_CEO_AUTH_ID)return <main><h1>CEO access required</h1></main>;return <Recovery/>;}
