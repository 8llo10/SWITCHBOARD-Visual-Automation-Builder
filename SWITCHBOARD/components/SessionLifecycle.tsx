'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {getSession,sb,setSession} from '../lib/switchboard';

export function SessionLifecycle(){
 const pathname=usePathname();
 useEffect(()=>{
  if(!getSession())return;
  let disposed=false;
  void sb('/auth/me').then(user=>{if(!disposed)setSession(undefined,user)}).catch(()=>{});
  const timer=setInterval(()=>{if(document.visibilityState==='visible')void sb('/auth/refresh',{method:'POST',body:'{}'}).catch(()=>{})},30*60*1000);
  return()=>{disposed=true;clearInterval(timer)};
 },[pathname]);
 return null;
}
