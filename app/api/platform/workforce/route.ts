import {platformOwner} from '@/lib/server/platform';
import {workforceFeed} from '@/lib/server/workforce';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 if(!await platformOwner())return Response.json({error:'Unauthorized'},{status:401,headers});
 try{
  return Response.json(await workforceFeed(),{headers});
 }catch{return Response.json({connected:false,runs:[],reason:'Activity feed unavailable. No current work can be verified.'},{status:503,headers});}
}
