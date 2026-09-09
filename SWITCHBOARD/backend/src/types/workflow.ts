export type NodeKind='trigger'|'createUser'|'disableUser'|'addGroup'|'assignLicense'|'condition'|'email'|'http'|'postgres'|'webhook'|'ssh'|'powershell'|'health'|'delay'|'approval'|'noop';
export type WorkflowNode={id:string;type?:string;position?:{x:number;y:number};data:{label:string;kind:NodeKind|string;subtitle?:string;config?:Record<string,unknown>;retry?:number;continueOnFailure?:boolean}};
export type WorkflowEdge={id?:string;source:string;target:string;sourceHandle?:string;data?:{when?:string|boolean}};
export type WorkflowDefinition={nodes:WorkflowNode[];edges:WorkflowEdge[]};
export type EngineContext={trigger:Record<string,unknown>;vars:Record<string,unknown>;outputs:Record<string,unknown>};
export type ExecutorResult={output?:unknown;route?:string|boolean;wait?:boolean};
