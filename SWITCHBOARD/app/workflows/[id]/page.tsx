import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {Shell} from '../../../components/Shell';
import {BuilderClient} from '../../../components/BuilderClient';
export default async function WorkflowBuilderPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <Shell title="Workflow builder" eyebrow="VISUAL ORCHESTRATION" actions={<Link className="secondary-btn compact" href="/workflows"><ArrowLeft size={15}/> Workflows</Link>}><BuilderClient workflowId={id}/></Shell>}
