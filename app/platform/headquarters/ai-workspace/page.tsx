import {redirect} from 'next/navigation';
import {platformOwner} from '@/lib/server/platform';
import {cloudFolderUrl} from '@/lib/hq-cloud-workspace';
import Workspace from './workspace';
import '../headquarters.css';
import './workspace.css';

export const dynamic = 'force-dynamic';

export default async function Page() {
  if (!await platformOwner()) redirect('/login');
  const folderUrl = cloudFolderUrl(process.env.OG_HQ_CLOUD_FOLDER_URL);
  return <Workspace folderUrl={folderUrl}/>;
}
