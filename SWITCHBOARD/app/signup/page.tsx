'use client';
import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,CheckCircle2,Eye,EyeOff,LockKeyhole,Mail,Network,RefreshCw,UserPlus} from 'lucide-react';
import {ApiError,sb} from '../../lib/switchboard';

type Config={registrationEnabled:boolean;emailVerificationRequired:boolean};
export default function Signup(){
 const router=useRouter();
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState<'checking'|'available'|'unavailable'|'unknown'>('checking');
 const checkAvailability=async()=>{
  setStatus('checking');
  try{const config=await sb<Config>('/auth/config',{auth:false});setStatus(config.registrationEnabled?'available':'unavailable')}
  catch{setStatus('unknown')}
 };
 useEffect(()=>{void checkAvailability()},[]);
 const valid=password.length>=10&&password===confirm&&name.trim().length>=2;
 async function submit(e:FormEvent){
  e.preventDefault();if(busy||!valid||status==='unavailable')return;
  setBusy(true);setError('');
  try{
   const result=await sb<{verificationRequired:boolean;verificationSent:boolean;message:string}>('/auth/register',{
    method:'POST',body:JSON.stringify({name:name.trim(),email:email.trim().toLowerCase(),password}),auth:false
   });
   router.replace('/verify-email?email='+encodeURIComponent(email.trim().toLowerCase())+'&sent='+(result.verificationSent?'1':'0'));
  }catch(err){
   if(err instanceof ApiError&&err.code==='EMAIL_DELIVERY_UNAVAILABLE')setStatus('unavailable');
   setError(err instanceof Error?err.message:'Could not create your account. Please retry.');
  }finally{setBusy(false)}
 }
 return <main className="terminal-auth sb-auth"><Link href="/" className="terminal-back"><ArrowLeft size={16}/> Back to home</Link><div className="terminal-auth-wrap"><section className="terminal-auth-copy"><Link href="/" className="terminal-mark"><span className="sb-auth-logo"><Network size={20}/></span><span>SWITCHBOARD</span></Link><small>CREATE YOUR WORKSPACE</small><h1>Build smarter.<br/><em>Operate with clarity.</em></h1><p>Connect services, automate repetitive tasks, and follow every execution in one secure visual workspace.</p><div className="terminal-lines"><span><CheckCircle2 size={16}/>Design workflows visually</span><span><CheckCircle2 size={16}/>Access based on your role</span><span><CheckCircle2 size={16}/>Secure email verification</span></div></section>
  <form className="terminal-form" onSubmit={submit}><header><span>CREATE ACCOUNT</span><UserPlus size={17}/></header><h2>Get started</h2><p className="sb-form-subtitle">Set up your workspace account. Email confirmation is required.</p>
   {status==='unavailable'&&<div className="terminal-error" role="alert"><b>Registration is temporarily unavailable.</b><p>Verification email delivery has not been configured by the administrator. Existing verified users can still sign in.</p><button type="button" className="sb-auth-retry" onClick={()=>void checkAvailability()}><RefreshCw size={15}/> Check again</button></div>}
   {status==='unknown'&&<div className="sb-auth-info" role="status"><Mail size={16}/> Couldn't check email delivery status. You can still try to register.</div>}
   <label htmlFor="signup-name">Full name</label><input id="signup-name" type="text" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={80} autoComplete="name" required placeholder="Your name"/>
   <label htmlFor="signup-email">Email address</label><input id="signup-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com"/>
   <label htmlFor="signup-password">Password</label><div className="sb-password-field"><input id="signup-password" type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required placeholder="At least 10 characters"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
   <label htmlFor="signup-confirm">Confirm password</label><div className="sb-password-field"><input id="signup-confirm" type={showPassword?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required placeholder="Repeat password"/><LockKeyhole size={15} className="sb-auth-password-icon"/></div>
   {confirm&&password!==confirm&&<p className="sb-password-mismatch">Passwords don't match.</p>}
   <p className="sb-password-help">Use at least 10 characters. We'll send a verification link to your email.</p>
   {error&&<div className="terminal-error" role="alert">{error}</div>}
   <button className="terminal-submit" type="submit" disabled={busy||!valid||status==='unavailable'||status==='checking'}>{busy?'Creating account…':status==='checking'?'Checking availability…':'Create account'} <ArrowRight size={17}/></button>
   <small>Already have an account? <Link href="/login">Sign in</Link></small>
  </form></div></main>
}
