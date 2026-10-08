import {redirect} from 'next/navigation';
import {platformOwner} from '@/lib/server/platform';
import PlatformCompanies from './companies';
import '../luxury-theme.css';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await platformOwner();if(!owner)redirect('/login');return <PlatformCompanies email={owner.email}/>}
