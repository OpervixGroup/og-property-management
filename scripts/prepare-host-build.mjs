import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run this preparation through npm run build.');
const command='install';
console.log(`[OG hosting] Installing production dependencies with npm ${command}.`);
const result=spawnSync(process.execPath,[npm,command,'--omit=dev','--install-strategy=hoisted','--no-audit','--no-fund'],{cwd:root,stdio:'inherit',env:process.env});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
const require=createRequire(new URL('../package.json',import.meta.url));
const next=require('next/package.json');
const env=require('@next/env');
if(typeof env.loadEnvConfig!=='function')throw new Error('Installed @next/env is incomplete.');
console.log(`[OG hosting] Next ${next.version} and @next/env verified. Starting production build.`);
