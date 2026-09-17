import Link from 'next/link';
import {Plus,Workflow} from 'lucide-react';
import {Shell} from '../../components/Shell';
import {DashboardClient} from '../../components/DashboardClient';
export default function DashboardPage(){return <Shell title="Operations overview" eyebrow="LIVE AUTOMATION CONTROL" actions={<Link className="primary-btn compact" href="/workflows"><Plus size={15}/> New workflow</Link>}><DashboardClient/></Shell>}
