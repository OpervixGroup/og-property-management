import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
if(!process.argv[2])throw Error('Usage: node scripts/verify-backup.mjs /absolute/path/OG_Backup.zip');
const files=unzipSync(await readFile(process.argv[2]));
const manifest=JSON.parse(new TextDecoder().decode(files['manifest.json']));
if(manifest.format!=='og-workspace-backup-v1'||!Array.isArray(manifest.files))throw Error('Unsupported backup');
const seen=new Set();for(const item of manifest.files){if(seen.has(item.path)||!files[item.path])throw Error('Missing or duplicate backup file');seen.add(item.path);if(createHash('sha256').update(files[item.path]).digest('hex')!==item.sha256)throw Error('Backup checksum mismatch');}
if(!seen.has('records.json')||Object.keys(files).some(p=>p!=='manifest.json'&&!seen.has(p)))throw Error('Unlisted backup content');
const snapshot=JSON.parse(new TextDecoder().decode(files['records.json']));if(snapshot.revision!==manifest.revision||!snapshot.data?.units||!snapshot.data?.statements)throw Error('Invalid workspace records');
console.log('Verified checksums: '+seen.size+' files; revision '+snapshot.revision+'; '+snapshot.data.units.length+' units; '+snapshot.data.statements.length+' statement versions. Financial validation and a restore drill are still required.');
