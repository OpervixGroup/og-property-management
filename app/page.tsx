import {getChatGPTUser} from './chatgpt-auth';
import Welcome from './welcome';
import PoolApp from './pool-app';
import PasswordPanel from './password-panel';
import ScopedWorkspace from './scoped-workspace';
import {PageSizeProvider} from './report-controls';
export const dynamic='force-dynamic';
export default async function Page(){const configured=!!process.env.NEXT_PUBLIC_SUPABASE_URL&&!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;const user=configured?await getChatGPTUser():null;if(!user)return <Welcome/>;return <PageSizeProvider userId={user.authId}>{user.mustChangePassword?<main className="login-shell"><PasswordPanel required/></main>:['Analyst / Agent','Maintenance','Accounting Clerk'].includes(user.role)?<ScopedWorkspace user={user}/>:<PoolApp user={user}/>}</PageSizeProvider>;}
