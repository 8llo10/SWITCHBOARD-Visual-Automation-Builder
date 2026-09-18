type Options=RequestInit&{auth?:boolean};
const TOKEN='switchboard_token',USER='switchboard_user';
export function setSession(token:string,user:unknown){if(typeof window==='undefined')return;localStorage.setItem(TOKEN,token);localStorage.setItem(USER,JSON.stringify(user))}
export function clearSession(){if(typeof window==='undefined')return;localStorage.removeItem(TOKEN);localStorage.removeItem(USER)}
export function getSession(){if(typeof window==='undefined')return null;const token=localStorage.getItem(TOKEN);if(!token)return null;try{return{token,user:JSON.parse(localStorage.getItem(USER)||'null')}}catch{return{token,user:null}}}
function apiMessage(data:any,status:number){
 const base=String(data?.error||`Request failed ${status}`);
 const details=data?.details;if(!details)return base;
 const fieldErrors=details.fieldErrors||{};const formErrors=details.formErrors||[];
 const pieces:string[]=[];
 for(const[key,values]of Object.entries(fieldErrors))for(const value of (Array.isArray(values)?values:[]))if(value)pieces.push(`${key}: ${value}`);
 for(const value of (Array.isArray(formErrors)?formErrors:[]))if(value)pieces.push(String(value));
 return pieces.length?`${base} — ${pieces.join(' · ')}`:base;
}
export async function sb<T=any>(path:string,init?:Options):Promise<T>{const session=getSession();const headers:any={'content-type':'application/json',...(init?.headers||{})};if(init?.auth!==false&&session?.token)headers.authorization=`Bearer ${session.token}`;const r=await fetch(`/api/switchboard${path}`,{...init,headers});const data=await r.json().catch(()=>({}));if(r.status===401&&init?.auth!==false&&typeof window!=='undefined'){clearSession();if(!location.pathname.startsWith('/login'))location.href='/login'}if(!r.ok)throw new Error(apiMessage(data,r.status));return data}
