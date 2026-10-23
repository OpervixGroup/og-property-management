import type {NextConfig} from 'next';
import {sourceDeploymentId} from './scripts/deployment-id.cjs';
const config:NextConfig={deploymentId:sourceDeploymentId(process.cwd()),poweredByHeader:false,allowedDevOrigins:['127.0.0.1','localhost','z64hid4a52.preview.c39.airoapp.ai'],async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'X-Frame-Options',value:'DENY'}]}];}};
export default config;
