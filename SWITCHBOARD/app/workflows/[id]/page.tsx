import {BuilderClient} from '../../../components/BuilderClient';
import {EditorRail} from '../../../components/EditorRail';
import '../../../components/editor-rail.css';
export default async function WorkflowBuilderPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <><EditorRail/><BuilderClient key={id} workflowId={id}/></>}
