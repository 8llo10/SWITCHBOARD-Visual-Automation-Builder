import {BuilderClient} from '../../../components/BuilderClient';
export default async function WorkflowBuilderPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <BuilderClient workflowId={id}/>}
