type Options=RequestInit&{auth?:boolean};
const USER='switchboard_user',MARKER='switchboard_authenticated',LEGACY_TOKEN='switchboard_token';
export type SessionUser={id:string;email:string;name:string;role:'ADMIN'|'OPERATOR'|'VIEWER';active?:boolean;emailVerifiedAt?:string|null};
export type Session={token:string;user:SessionUser};

export function setSession(_token:string|undefined,user:SessionUser){
 if(typeof window==='undefined')return;
 localStorage.removeItem(LEGACY_TOKEN);
 localStorage.setItem(MARKER,'1');
 localStorage.setItem(USER,JSON.stringify(user));
}
export function clearSession(){
 if(typeof window==='undefined')return;
 localStorage.removeItem(LEGACY_TOKEN);
 localStorage.removeItem(MARKER);
 localStorage.removeItem(USER);
}
export function getSession():Session|null{
 if(typeof window==='undefined')return null;
 const marker=localStorage.getItem(MARKER);
 const legacy=localStorage.getItem(LEGACY_TOKEN);
 if(!marker&&!legacy)return null;
 try{
  const user=JSON.parse(localStorage.getItem(USER)||'null') as SessionUser|null;
  if(!user?.id||!user?.email)return null;
  return {token:legacy||'cookie',user};
 }catch{return null}
}
export async function logoutSession(){
 try{await fetch('/api/switchboard/auth/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:'{}'})}
 catch{/* A failed network request should not trap the user in the UI. */}
 finally{clearSession()}
}

function apiMessage(data:any,status:number){
 const base=String(data?.error||`Request failed ${status}`);
 const details=data?.details;
 if(!details)return base;
 const fieldErrors=details.fieldErrors||{};
 const formErrors=details.formErrors||[];
 const pieces:string[]=[];
 for(const [key,values] of Object.entries(fieldErrors))for(const value of (Array.isArray(values)?values:[]))if(value)pieces.push(`${key}: ${value}`);
 for(const value of (Array.isArray(formErrors)?formErrors:[]))if(value)pieces.push(String(value));
 return pieces.length?`${base} — ${pieces.join(' · ')}`:base;
}
export class ApiError extends Error{
 readonly status:number;
 readonly code:string|null;
 constructor(data:any,status:number){super(apiMessage(data,status));this.name='ApiError';this.status=status;this.code=typeof data?.code==='string'?data.code:null}
}
export async function sb<T=any>(path:string,init?:Options):Promise<T>{
 const session=getSession();
 const headers=new Headers(init?.headers);
 if(!headers.has('content-type')&&init?.body)headers.set('content-type','application/json');
 const legacy=session?.token&&session.token!=='cookie'?session.token:null;
 if(init?.auth!==false&&legacy)headers.set('authorization',`Bearer ${legacy}`);
 const response=await fetch(`/api/switchboard${path}`,{...init,headers,credentials:'same-origin',cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(response.status===401&&init?.auth!==false&&typeof window!=='undefined'){
  clearSession();
  if(!location.pathname.startsWith('/login'))location.href='/login';
 }
 if(!response.ok)throw new ApiError(data,response.status);
 return data as T;
}
/** Verify the HttpOnly cookie with the server instead of trusting localStorage. */
export async function restoreSession():Promise<Session|null>{
 try{
  const user=await sb<SessionUser>('/auth/me',{auth:false});
  if(!user?.id||!user?.email)throw new Error('The server did not return an authenticated user.');
  setSession(undefined,user);
  return {token:'cookie',user};
 }catch(error){
  if(error instanceof ApiError&&(error.status===401||error.status===403)){clearSession();return null}
  throw error;
 }
}
