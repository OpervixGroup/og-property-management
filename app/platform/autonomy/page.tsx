import {platformOwner} from '@/lib/server/platform';
import Controls from './controls';
export const dynamic='force-dynamic';
export default async function Autonomy(){const owner=await platformOwner();if(!process.env.OG_CEO_AUTH_ID||owner?.authId!==process.env.OG_CEO_AUTH_ID)return <main><h1>CEO access required</h1><p>Verified CEO mapping and an active owner session are required.</p></main>;return <Controls/>;}
