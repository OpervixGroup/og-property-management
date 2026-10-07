import {loadMarket} from '@/lib/public-market';
export async function GET(){return Response.json(await loadMarket(),{headers:{'Cache-Control':'public, max-age=300, s-maxage=3600'}});}
