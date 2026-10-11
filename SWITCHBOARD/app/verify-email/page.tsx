'use client';
import {Suspense,useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {CheckCircle2,Mail,Network,RefreshCw,XCircle} from 'lucide-react';
import {sb} from '../../lib/switchboard';

type VerificationState='idle'|'working'|'verified'|'error';
function VerifyEmailContent(){
 const query=useSearchParams();
 const token=query.get('token');
 const email=query.get('email')||'';
 const wasNotSent=query.get('sent')==='0';
 const [state,setState]=useState<VerificationState>(token?'working':'idle');
 const [message,setMessage]=useState(token?'Checking your secure verification link…':wasNotSent?'Your account was created, but the verification email could not be delivered. You can try resending it after email delivery is restored.':'Check your inbox for a verification email, then open the link to activate your account.');
 const [resendError,setResendError]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!token)return;
  let cancelled=false;
  sb('/auth/verify-email',{method:'POST',body:JSON.stringify({token}),auth:false})
   .then(()=>{if(!cancelled){setState('verified');setMessage('Your email has been verified. Your account is ready. You can sign in now.');window.history.replaceState(null,'','/verify-email?verified=1'+(email?'&email='+encodeURIComponent(email):''))}})
   .catch((e:unknown)=>{if(!cancelled){setState('error');setMessage(e instanceof Error?e.message:'This verification link is invalid or expired.')}})
  return()=>{cancelled=true};
 },[token,email]);
 async function resend(){
  if(!email||busy)return;
  setBusy(true);setResendError('');
  try{const result=await sb<{message?:string}>('/auth/resend-verification',{method:'POST',body:JSON.stringify({email}),auth:false});setMessage(result.message||'If your account needs verification, we will send an email.');setState('idle')}
  catch(e){setResendError(e instanceof Error?e.message:'Unable to resend the verification email.')}
  finally{setBusy(false)}
 }
 return <main className="terminal-auth sb-verify"><div className="verify-wrap">
  <div className="terminal-mark"><Network size={20}/><span>SWITCHBOARD</span></div>
  <div className={'verify-orb '+state}>{state==='verified'?<CheckCircle2 size={32}/>:state==='error'?<XCircle size={32}/>:<Mail size={32}/>}</div>
  <small>ACCOUNT VERIFICATION</small>
  <h1>{state==='working'?'Verifying your email…':state==='verified'?'Email verified!':state==='error'?'Could not verify':'Check your inbox'}</h1>
  <p role="status">{message}</p>
  {email&&<code>{email}</code>}
  {resendError&&<div className="terminal-error" role="alert">{resendError}</div>}
  <div className="verify-actions">{state!=='verified'&&email&&<button type="button" className="terminal-submit" onClick={()=>void resend()} disabled={busy||state==='working'}><RefreshCw size={15} className={busy?'spin':''}/>{busy?'Sending…':'Resend verification email'}</button>}
  <Link href="/login" className="ghost-btn">{state==='verified'?'Continue to sign in':'Back to sign in'}</Link></div>
  {state!=='verified'&&!email&&<p className="sb-verification-hint">If you did not receive an email, return to sign in with your account email to resend verification.</p>}
 </div></main>;
}
function VerifyLoading(){return <main className="terminal-auth sb-verify"><div className="verify-wrap"><div className="verify-orb working"><Mail size={30}/></div><h1>Loading verification…</h1></div></main>}
export default function VerifyEmail(){return <Suspense fallback={<VerifyLoading/>}><VerifyEmailContent/></Suspense>}
