import {DashboardClient} from '../../components/DashboardClient';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import '../workflows/workflows.css';
export default function DashboardPage(){return <main className="wf-home"><header className="wf-header"><Link className="wf-brand" href="/workflows">SWITCHBOARD</Link><Link className="wf-btn" href="/workflows"><ArrowLeft size={16}/> Back to workflows</Link></header><div className="wf-intro"><div><p className="wf-kicker">Analytics & operations</p><h1>Workspace overview</h1><p>Track active automations and recent executions.</p></div></div><DashboardClient/></main>}