'use client';
import Link from 'next/link';
import {ArrowRight,Blocks,Play,ShieldCheck,Sparkles,Workflow,Zap} from 'lucide-react';
import {Logo} from '../components/Logo';

export default function Landing(){return <main className="landing-page">
  <div className="hero-video" aria-hidden><video autoPlay muted loop playsInline src="https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8"/><div className="video-fallback"/><div className="video-overlay"/></div>
  <nav className="landing-nav liquid-glass"><Logo size={42}/><div className="landing-links"><a href="#platform">Platform</a><a href="#security">Security</a><a href="#architecture">Architecture</a></div><div className="nav-cta"><Link className="text-btn" href="/login">Sign in</Link><Link className="glass-btn" href="/dashboard">Open console</Link></div></nav>
  <section className="landing-hero">
    <div className="hero-badge"><span/> VISUAL IT AUTOMATION · REAL EXECUTION</div>
    <h1>Build operations.<br/><em>Not scripts.</em></h1>
    <p>SWITCHBOARD turns repeatable IT procedures into secure, executable workflows — with visual orchestration, approvals, triggers, encrypted credentials, durable run history, and auditability built in.</p>
    <div className="hero-actions"><Link href="/login" className="primary-hero-btn">Enter SWITCHBOARD <ArrowRight size={18}/></Link><Link href="/workflows" className="outline-hero-btn"><Play size={17}/> Explore workflows</Link></div>
    <div className="hero-proof"><span><Zap/> Manual · Webhook · Schedule</span><span><ShieldCheck/> RBAC + encrypted secrets</span><span><Workflow/> Durable runs & logs</span></div>
  </section>
  <div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/>
  <div className="landing-bottom" id="platform"><div><span className="mini-icon"><Blocks/></span><b>Execution engine</b><small>Graph traversal, branching, retries, approvals</small></div><div><span className="mini-icon"><Sparkles/></span><b>Operational clarity</b><small>Every run, step, error and audit event persisted</small></div><div><span className="mini-icon"><ShieldCheck/></span><b>Built for control</b><small>Ownership, roles, secrets and secure webhooks</small></div></div>
 </main>}
