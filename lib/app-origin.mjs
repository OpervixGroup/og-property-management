const projectOrigins=['https://og.opervixgroup.com','https://z64hid4a52.preview.c39.airoapp.ai'];
function configuredOrigin(value){
 if(typeof value!=='string'||!value)return null;
 try{const u=new URL(value);if(u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))return null;return u.origin;}catch{return null;}
}
// Fixed verified project addresses plus an explicitly configured server address.
// No request-host trust, wildcards, substring matching or forwarded-header trust.
export function appOriginAllowed(supplied,configured){
 if(typeof supplied!=='string'||supplied==='null')return false;
 const allowed=[...projectOrigins,...(Array.isArray(configured)?configured:[configured]).map(configuredOrigin).filter(Boolean)];
 return allowed.includes(supplied);
}
