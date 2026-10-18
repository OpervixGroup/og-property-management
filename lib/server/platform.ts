import 'server-only';
import {platformIdentity} from './platform-identity';
export async function platformOwner(){const user=await platformIdentity();return !user||user.mustChangePassword?null:{authId:user.authId,email:user.email};}
