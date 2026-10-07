'use client';
import {useState} from 'react';
import type {Data} from '@/lib/pool';
import type {Doc} from '@/lib/exports';
import OwnerRun from '../owner-run';
import OwnerRunSettings from '../owner-run-settings';
export default function Preview({data,docs}:{data:Data;docs:Doc[]}){const [period,setPeriod]=useState('2026-10');return <main style={{maxWidth:1360,margin:'0 auto',padding:'24px 16px'}}><p role="status" style={{color:'#586875',fontSize:12,marginBottom:16}}>LOCAL DESIGN PREVIEW · October 7 backup · read only · no live payments or approvals</p><OwnerRunSettings data={data} reviewer="Local preview" busy={false} persist={async()=>false} navigate={()=>{}}/><OwnerRun initialOwnerId="owner-1" data={data} docs={docs} period={period} setPeriod={setPeriod} userId="local-preview" reviewer="Local preview" busy={true} persist={async()=>false} navigate={()=>{}}/></main>;}
