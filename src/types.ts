export interface SSEEvent {
  type: string;
  data: string;
  id?: string;
}

export interface TraceEntry {
  id: string;
  timestamp: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string>;
    body: unknown;
    sseContent?: string;  // Consolidated SSE content for readability
  };
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
  metadata: {
    isSSE: boolean;
    threadId?: string;
  };
}

export interface ProxyConfig {
  port: number;
  outputFile: string;
  certDir: string;
  targetHosts: string[];
}

export interface RequestContext {
  id: string;
  startTime: Date;
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyChunks: Buffer[];
}

export interface ResponseContext {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  bodyChunks: Buffer[];
  isSSE: boolean;
}
