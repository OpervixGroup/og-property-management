import {notFound} from 'next/navigation';
import {readFile} from 'node:fs/promises';
import {seed} from '@/lib/seed';
import type {Data} from '@/lib/pool';
import Preview from './preview';
export const dynamic='force-dynamic';
export default async function OwnerRunPreview(){
 if(process.env.NODE_ENV!=='development')notFound();
 const data:Data=process.env.OG_PREVIEW_DATA?JSON.parse(await readFile(process.env.OG_PREVIEW_DATA,'utf8')):seed();
 const docs=process.env.OG_PREVIEW_DOCUMENTS?JSON.parse(await readFile(process.env.OG_PREVIEW_DOCUMENTS,'utf8')):[];
 return <Preview data={data} docs={docs}/>;
}
