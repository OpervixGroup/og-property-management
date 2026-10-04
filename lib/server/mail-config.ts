import 'server-only';
export function mailConfigured(){return process.env.OG_WORK_EMAIL_ENABLED==='true'&&/^[a-f0-9-]{36}$/i.test(process.env.MS_TENANT_ID??'')&&/^[a-f0-9-]{36}$/i.test(process.env.MS_CLIENT_ID??'')&&!!process.env.MS_CLIENT_SECRET;}
