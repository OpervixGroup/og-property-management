import {redirect} from 'next/navigation';
import {platformOwner} from '@/lib/server/platform';
import Headquarters from './workforce';
import './headquarters.css';
export const dynamic='force-dynamic';
export default async function Page(){if(!await platformOwner())redirect('/login');return <Headquarters/>;}
