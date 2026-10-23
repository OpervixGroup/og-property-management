import {redirect} from 'next/navigation';
import {platformOwner} from '@/lib/server/platform';
import ClientCampus from './workspace';
import '../headquarters.css';
import './campus.css';
export const dynamic='force-dynamic';
export default async function Page(){if(!await platformOwner())redirect('/login');return <ClientCampus/>;}
