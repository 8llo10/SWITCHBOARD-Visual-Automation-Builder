type Options=RequestInit&{auth?:boolean};
const USER='switchboard_user',MARKER='switchboard_authenticated',LEGACY_TOKEN='switchboard_token';
export function setSession(_token:string|undefined,user:unknown){if(typeof window==='undefined')return;localStorage.removeItem(LEGACY_TOKEN);localStorage.setItem(MARKER,'1');localStorage.setItem(USER,JSON.stringify(user))}
export function clearSession(){if(typeof window==='undefined')return;localStorage.removeItem(LEGACY_TOKEN);localStorage.removeItem(MARKER);localStorage.removeItem(USER)}
export function getSession(){if(typeof window==='undefined')return null;const marker=localStorage.getItem(MARKER);if(!marker)return null;try{return{token:'cookie',user:JSON.parse(localStorage.getItem(USER)||'null')}}catch{return{token:'cookie',user:null}}}
export async function logoutSession(){try{await fetch('/api/switchboard/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})}finally{clearSession()}}
function apiMessage(data:any,status:number){
 const base=String(data?.error||`Request failed ${status}`);
 const details=data?.details;if(!details)return base;
 const fieldErrors=details.fieldErrors||{};const formErrors=details.formErrors||[];
 const pieces:string[]=[];
 for(const[key,values]of Object.entries(fieldErrors))for(const value of (Array.isArray(values)?values:[]))if(value)pieces.push(`${key}: ${value}`);
 for(const value of (Array.isArray(formErrors)?formErrors:[]))if(value)pieces.push(String(value));
 return pieces.length?`${base} — ${pieces.join(' · ')}`:base;
}
export async function sb<T=any>(path:string,init?:Options):Promise<T>{const session=getSession();const headers:any={'content-type':'application/json',...(init?.headers||{})};const r=await fetch(`/api/switchboard${path}`,{...init,headers,credentials:'same-origin'});const data=await r.json().catch(()=>({}));if(r.status===401&&init?.auth!==false&&typeof window!=='undefined'){clearSession();if(!location.pathname.startsWith('/login'))location.href='/login'}if(!r.ok)throw new Error(apiMessage(data,r.status));return data}
