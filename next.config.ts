import type {NextConfig} from 'next';
const config:NextConfig={poweredByHeader:false,allowedDevOrigins:['z64hid4a52.preview.c39.airoapp.ai'],async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'X-Frame-Options',value:'DENY'}]}];}};
export default config;
