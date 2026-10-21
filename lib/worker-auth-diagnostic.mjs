import {timingSafeEqual} from 'node:crypto';
export function workerSecretFlags(secret){return {configured:typeof secret==='string'&&secret.length>=32,hasWhitespaceOrControl:typeof secret==='string'&&!/^[\x21-\x7e]*$/.test(secret),hasSurroundingQuotes:typeof secret==='string'&&((secret.startsWith('"')&&secret.endsWith('"'))||(secret.startsWith("'")&&secret.endsWith("'")))};}
// Server-only reason codes. Never return these to unauthenticated clients;
// never log token values, token lengths, fingerprints, headers or request body.
export function workerAuthDiagnostic(secret,authorization){
 if(typeof secret!=='string'||secret.length<32)return 'RUNTIME_SECRET_UNAVAILABLE';
 if(typeof authorization!=='string'||!authorization)return 'AUTHORIZATION_HEADER_MISSING';
 const expected='Bearer '+secret;
 if(Buffer.byteLength(authorization)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(authorization),Buffer.from(expected)))return 'MATCH';
 if(!/^[\x21-\x7e]+$/.test(secret))return 'RUNTIME_SECRET_WHITESPACE_OR_CONTROL';
 if((secret.startsWith('"')&&secret.endsWith('"'))||(secret.startsWith("'")&&secret.endsWith("'")))return 'RUNTIME_SECRET_SURROUNDING_QUOTES';
 if(!authorization.startsWith('Bearer '))return 'AUTHORIZATION_SCHEME_MISMATCH';
 return 'CREDENTIAL_MISMATCH';
}
export function workerAuthObserver(secret,request,logger){
 const code=workerAuthDiagnostic(secret,request.headers.get('authorization'));
 if(code!=='MATCH'&&typeof logger==='function')logger({event:'private-worker-auth',diagnosticVersion:'1',reason:code});
 return code;
}
export function boundedWorkerAuthLogger(logger){const seen=new Set();return entry=>{if(entry?.event!=='private-worker-auth'||entry.diagnosticVersion!=='1'||!['RUNTIME_SECRET_UNAVAILABLE','AUTHORIZATION_HEADER_MISSING','RUNTIME_SECRET_WHITESPACE_OR_CONTROL','RUNTIME_SECRET_SURROUNDING_QUOTES','AUTHORIZATION_SCHEME_MISMATCH','CREDENTIAL_MISMATCH'].includes(entry.reason)||seen.has(entry.reason))return;seen.add(entry.reason);logger({event:'private-worker-auth',diagnosticVersion:'1',reason:entry.reason});};}
