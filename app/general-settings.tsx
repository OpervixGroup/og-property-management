'use client';
import OwnerRunSettings from './owner-run-settings';
import WorkEmailPanel from './work-email-panel';
import ServiceConnections from './service-connections';
import ApprovalCenter from './approval-center';
import UsersPanel from './users-panel';
import StorageConnection from './storage-connection';
import {useState} from 'react';
import {Building2,Users,Wallet,CheckCheck,Wrench,FileText,Plus} from 'lucide-react';
import {type Data,audit} from '@/lib/pool';
import {STAFF_ROLES,roleScope,allPropertyScope,type StaffUser,type StaffRole} from '@/lib/staff-users';
import type {ChatGPTUser} from './chatgpt-auth';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Checkbox} from '@/components/ui/checkbox';
import {Grid,Pick} from './report-controls';
import {download} from '@/lib/exports';
import {toast} from 'sonner';
const sections=[
 {title:'Company & properties',icon:Building2,links:[['Property profile, properties & pools','properties']]},
 {title:'Accounting',icon:Wallet,links:[['Accounting periods & monthly assumptions','settings'],['Allocation rules, contract fees & GL mapping','accounting']]},
 {title:'Approvals',icon:CheckCheck,links:[['Review & approve owner statements','statements'],['Prepare approved owner distributions','distributions']]},
 {title:'Maintenance',icon:Wrench,links:[['Work orders & procurement','maintenance']]},
 {title:'Documents & communication',icon:FileText,links:[['Supporting documents','documents'],['Statement preview & email preparation','statements'],['Communication records','communication']]},
];
export default function GeneralSettings({data,user,busy,navigate,persist,onRefresh}:{data:Data;user:ChatGPTUser;busy:boolean;navigate:(view:string)=>void;persist:(d:Data,message?:string)=>Promise<boolean>;onRefresh?:()=>Promise<void>}){
 const [showUsers,setShowUsers]=useState(false),[showRoles,setShowRoles]=useState(false),[form,setForm]=useState<StaffUser|null>(null);
 const [backingUp,setBackingUp]=useState(false);
 async function backup(){setBackingUp(true);try{const r=await fetch('/api/backup');if(!r.ok)throw Error(((await r.json()) as {error:string}).error);download(await r.blob(),'OG_Workspace_Backup_'+new Date().toISOString().slice(0,10)+'.zip');toast.success('Backup downloaded. Keep it in a protected location.');}catch(e){toast.error((e as Error).message);}finally{setBackingUp(false);}}

 return <><div className="section-heading"><div><h2>General settings</h2><p>Company information, staff access and property-management controls.</p></div></div><OwnerRunSettings data={data} reviewer={user.displayName} busy={busy} persist={persist} navigate={navigate}/><UsersPanel data={data} user={user}/><ServiceConnections data={data} period={data.periods.at(-1)?.month??new Date().toISOString().slice(0,7)} busy={busy} persist={persist} navigate={navigate}/><WorkEmailPanel canSend={['Global Admin','Management'].includes(user.role)} data={data} busy={busy} refresh={()=>{void onRefresh?.();}}/><ApprovalCenter disabled={busy} onSaved={onRefresh}/><section className="panel"><h3>Backup & recovery</h3><p>Download saved records, statement versions, audit history and supporting documents together. Save changes before backing up.</p><button disabled={busy||backingUp||user.role!=='Global Admin'} onClick={backup}>{backingUp?'Preparing backup…':'Download workspace backup'}</button><p className="hint">Manual backup · private financial data · 50 MB download limit. Historical database snapshots and login accounts are excluded. Recovery requires administrator verification in a separate workspace before replacing live data. Automatic scheduled backups are not connected.</p></section><div className="settings-hub">{sections.map(section=><section className="panel" key={section.title}><section.icon size={24}/><h3>{section.title}</h3><div className="settings-links">{section.links.map(([label,view])=><button key={label} className="text-button" onClick={()=>navigate(view)}>{label}</button>)}</div></section>)}</div><p className="hint">These links open the existing workflow screens. Record-action approvals are managed in the Approval center. Document-template editing and automatic communications are handled in later implementation phases.</p>
 <Dialog open={showRoles} onOpenChange={setShowRoles}><DialogContent className="ops-dialog"><DialogHeader><DialogTitle>Roles & permissions</DialogTitle><DialogDescription>Server-enforced access levels in standalone OG.</DialogDescription></DialogHeader><Grid headers={['Role','Scope']} rows={STAFF_ROLES.map(role=>[role,roleScope[role]])}/><p className="hint">Global Admin and Management can add staff within their scope. Only Global Admin can grant Global Admin access. Accountant and External CPA can view all properties and print or download reports, with no changes.</p></DialogContent></Dialog>
</>;
}
