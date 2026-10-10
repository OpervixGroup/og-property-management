/** Hosting readiness only: never represents a bank authorization or an active feed. */
export function plaidSetup(env:NodeJS.ProcessEnv){
 const enabled=env.OG_PLAID_ENABLED==='true',environment=env.OG_PLAID_ENVIRONMENT??'sandbox';
 const missing=['OG_PLAID_CLIENT_ID','OG_PLAID_SECRET','OG_PLAID_ENCRYPTION_KEY'].filter(k=>!env[k]?.trim());
 const invalid:string[]=[];if(!['sandbox','production'].includes(environment))invalid.push('OG_PLAID_ENVIRONMENT');
 if(env.OG_PLAID_ENCRYPTION_KEY){const key=Buffer.from(env.OG_PLAID_ENCRYPTION_KEY,'base64');if(key.length!==32||key.toString('base64')!==env.OG_PLAID_ENCRYPTION_KEY)invalid.push('OG_PLAID_ENCRYPTION_KEY');}
 if(env.OG_PLAID_REDIRECT_URI)try{const url=new URL(env.OG_PLAID_REDIRECT_URI),app=new URL(env.OG_APP_URL??'');if(url.protocol!=='https:'||url.origin!==app.origin||url.username||url.password||url.search||url.hash)throw Error();}catch{invalid.push('OG_PLAID_REDIRECT_URI');}
 return {provider:'Plaid Link',environment,enabled,configured:enabled&&!missing.length&&!invalid.length,connected:false,missing,invalid,status:'Setup prepared; bank authorization and feed integration are not active'};
}
