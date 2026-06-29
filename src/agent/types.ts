export interface AgentTask {
  prompt: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface AgentResponse {
  provider: string;
  content: string;
  raw: unknown;
}

export interface AgentProvider {
  readonly name: string;
  readonly command: string;
  isAvailable(): Promise<boolean>;
  run(task: AgentTask): Promise<AgentResponse>;
}
