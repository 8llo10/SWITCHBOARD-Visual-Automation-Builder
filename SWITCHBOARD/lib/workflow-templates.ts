/**
 * Safe starter blueprints for the visual editor.
 * Examples use a local directory model or read-only public HTTP requests.
 * They never execute until a user explicitly runs them.
 */
export type TemplateId='blank'|'health'|'onboarding'|'triage';
export type WorkflowDefinition={nodes:Array<{id:string;type:'custom';position:{x:number;y:number};data:{label:string;kind:string;config:Record<string,unknown>}}>;edges:Array<{id:string;source:string;target:string;sourceHandle?:string;data?:{when:string}}>} ;
export const starterTemplates:[
 {id:TemplateId;name:string;description:string;category:string;nodes:number;accent:string;path:string[]},
 ...Array<{id:TemplateId;name:string;description:string;category:string;nodes:number;accent:string;path:string[]}>
]=[
 {id:'blank',name:'Start from scratch',description:'A clean canvas with a manual trigger. Build exactly what you need.',category:'ESSENTIAL',nodes:1,accent:'violet',path:['Trigger']},
 {id:'health',name:'Service health check',description:'Check an endpoint and log its response, latency, and health status.',category:'MONITORING',nodes:2,accent:'mint',path:['Trigger','Health check']},
 {id:'onboarding',name:'Employee onboarding',description:'Create a directory user, check the department, and assign access.',category:'IT OPERATIONS',nodes:5,accent:'blue',path:['Trigger','Create user','Condition','Access']},
 {id:'triage',name:'Incident triage',description:'Branch on incident severity and route work down distinct paths.',category:'LOGIC',nodes:4,accent:'orange',path:['Trigger','Condition','Two routes']}
];
const node=(id:string,kind:string,label:string,x:number,y:number,config:Record<string,unknown>={})=>({id,type:'custom' as const,position:{x,y},data:{label,kind,config}});
const edge=(id:string,source:string,target:string,when?:'true'|'false')=>({id,source,target,...(when?{sourceHandle:when,data:{when}}:{})});
export function createTemplateDefinition(id:TemplateId):WorkflowDefinition{
 if(id==='health')return{nodes:[
  node('start','trigger','Manual Trigger',80,160),
  node('check','health','Check Service Health',380,160,{url:'https://example.com',timeoutMs:8000})
 ],edges:[edge('e1','start','check')]};
 if(id==='onboarding')return{nodes:[
  node('start','trigger','New Employee',80,240),
  node('create','createUser','Create Directory User',360,240,{email:'{{trigger.email}}',fullName:'{{trigger.fullName}}',department:'{{trigger.department}}'}),
  node('check','condition','IT Department?',660,240,{field:'trigger.department',operator:'equals',value:'IT'}),
  node('group','addGroup','Assign IT Group',965,100,{email:'{{trigger.email}}',group:'IT'}),
  node('license','assignLicense','Assign Standard License',965,380,{email:'{{trigger.email}}',license:'Standard'})
 ],edges:[edge('e1','start','create'),edge('e2','create','check'),edge('e3','check','group','true'),edge('e4','check','license','false')]};
 if(id==='triage')return{nodes:[
  node('start','trigger','Incident Received',80,230),
  node('route','condition','Critical Severity?',370,230,{field:'trigger.severity',operator:'equals',value:'critical'}),
  node('urgent','delay','Urgent Response',670,80,{ms:1000}),
  node('normal','delay','Normal Queue',670,360,{ms:3000})
 ],edges:[edge('e1','start','route'),edge('e2','route','urgent','true'),edge('e3','route','normal','false')]};
 return{nodes:[node('start','trigger','Manual Trigger',180,220)],edges:[]};
}
