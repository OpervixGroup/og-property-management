'use client';
import {useEffect} from 'react';
export default function IncidentReporter(){useEffect(()=>{let reported=false;const report=()=>{if(reported)return;reported=true;void fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'Incident',route:window.location.pathname})}).catch(()=>{});};window.addEventListener('error',report);window.addEventListener('unhandledrejection',report);return()=>{window.removeEventListener('error',report);window.removeEventListener('unhandledrejection',report);};},[]);return null;}
