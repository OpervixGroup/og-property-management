import {redirect} from 'next/navigation';
import {platformIdentity} from '@/lib/server/platform-identity';
import PasswordPanel from '@/app/password-panel';
import '../../platform.css';
import '../../luxury-theme.css';
export const dynamic='force-dynamic';
export default async function Page(){const user=await platformIdentity();if(!user)redirect('/login');return <main className="app platform-shell"><a href="/"><img src="/opervix-logo-luxury.webp" alt="Opervix Group" width={80} height={80}/></a><PasswordPanel required endpoint="/api/platform/password" destination="/platform"/></main>;}
