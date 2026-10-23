import '../platform.css';
import {redirect} from 'next/navigation';
import {platformIdentity} from '@/lib/server/platform-identity';
import PlatformCompanies from './companies';
import '../luxury-theme.css';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await platformIdentity();if(!owner)redirect('/login');if(owner.mustChangePassword)redirect('/platform/change-password');return <PlatformCompanies email={owner.email}/>}
