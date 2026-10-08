import {requireChatGPTUser} from '../chatgpt-auth';
import {platformOwner} from '@/lib/server/platform';
import {redirect} from 'next/navigation';

import PoolApp from '../pool-app';
import PasswordPanel from '../password-panel';
import ScopedWorkspace from '../scoped-workspace';
import {PageSizeProvider} from '../report-controls';
export const dynamic='force-dynamic';
export default async function Page(){if(await platformOwner())redirect('/platform');const user=await requireChatGPTUser('/workspace');return <PageSizeProvider userId={user.authId}>{user.mustChangePassword?<main className="login-shell"><PasswordPanel required/></main>:['Analyst / Agent','Maintenance','Accounting Clerk'].includes(user.role)?<ScopedWorkspace user={user}/>:<PoolApp user={user}/>}</PageSizeProvider>;}
