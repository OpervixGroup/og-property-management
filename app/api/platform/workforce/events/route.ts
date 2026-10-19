import {body} from '@/lib/server/request';
import {recordWorkforce,verifyWorkforceSecret} from '@/lib/server/workforce';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){try{verifyWorkforceSecret(request);return Response.json(await recordWorkforce(await body(request,300000)),{status:202,headers});}catch(e){const message=e instanceof Error?e.message:'Workforce event rejected';return Response.json({error:message},{status:message==='Access denied'?403:400,headers});}}
