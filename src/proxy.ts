import { Proxy } from 'http-mitm-proxy';
import { v4 as uuidv4 } from 'uuid';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ProxyConfig, RequestContext, ResponseContext, TraceEntry } from './types.js';
import { JsonlLogger } from './logger.js';
import { redactHeaders } from './utils/headers.js';
import { parseSSEBuffer, isSSEContentType, consolidateSSEContent } from './sse-handler.js';

const TARGET_HOSTS = [
  'api.githubcopilot.com',
  'api.individual.githubcopilot.com',
];

function parseBodyAsJson(body: string | null): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body; // Return raw string if not valid JSON
  }
}

interface ContextStore {
  request: RequestContext;
  response: ResponseContext;
}

export function createProxy(config: ProxyConfig): Proxy {
  const proxy = new Proxy();
  const logger = new JsonlLogger(config.outputFile);
  const contextMap = new WeakMap<IncomingMessage, ContextStore>();

  proxy.onError((_ctx, err) => {
    const message = err?.message ?? 'Unknown error';
    // Suppress common non-critical errors (connection resets from client)
    if (message.includes('ECONNRESET') || message.includes('socket hang up')) {
      return;
    }
    console.error('[proxy] Error:', message);
  });

  proxy.onRequest((ctx, callback) => {
    const host = ctx.clientToProxyRequest.headers.host || '';
    const isTargetHost = TARGET_HOSTS.some(h => host.includes(h));

    if (!isTargetHost) {
      return callback();
    }

    const requestId = uuidv4();
    const startTime = new Date();
    const method = ctx.clientToProxyRequest.method || 'GET';
    const url = `https://${host}${ctx.clientToProxyRequest.url}`;

    console.log(`[proxy] ${method} ${url}`);

    const store: ContextStore = {
      request: {
        id: requestId,
        startTime,
        method,
        url,
        headers: redactHeaders(ctx.clientToProxyRequest.headers as Record<string, string>),
        bodyChunks: [],
      },
      response: {
        statusCode: 0,
        statusMessage: '',
        headers: {},
        bodyChunks: [],
        isSSE: false,
      },
    };

    contextMap.set(ctx.clientToProxyRequest, store);

    callback();
  });

  proxy.onRequestData((ctx, chunk, callback) => {
    const store = contextMap.get(ctx.clientToProxyRequest);
    if (store) {
      store.request.bodyChunks.push(chunk);
    }
    return callback(null, chunk);
  });

  proxy.onResponse((ctx, callback) => {
    const store = contextMap.get(ctx.clientToProxyRequest);
    if (!store) {
      return callback();
    }

    const serverResponse = ctx.serverToProxyResponse;
    if (serverResponse) {
      store.response.statusCode = serverResponse.statusCode || 0;
      store.response.statusMessage = serverResponse.statusMessage || '';
      store.response.headers = redactHeaders(serverResponse.headers as Record<string, string>);
      store.response.isSSE = isSSEContentType(serverResponse.headers['content-type']);
    }

    callback();
  });

  proxy.onResponseData((ctx, chunk, callback) => {
    const store = contextMap.get(ctx.clientToProxyRequest);
    if (store) {
      store.response.bodyChunks.push(chunk);
    }
    return callback(null, chunk);
  });

  proxy.onResponseEnd((ctx, callback) => {
    const store = contextMap.get(ctx.clientToProxyRequest);
    if (!store) {
      return callback();
    }

    const endTime = new Date();
    const requestBodyRaw = store.request.bodyChunks.length > 0
      ? Buffer.concat(store.request.bodyChunks).toString('utf-8')
      : null;
    const responseBodyRaw = store.response.bodyChunks.length > 0
      ? Buffer.concat(store.response.bodyChunks).toString('utf-8')
      : null;

    // Parse JSON bodies for readability
    const requestBody = parseBodyAsJson(requestBodyRaw);
    let responseBody: unknown = parseBodyAsJson(responseBodyRaw);
    let sseContent: string | undefined;

    // For SSE responses, consolidate into readable content
    if (store.response.isSSE && responseBodyRaw) {
      const events = parseSSEBuffer(responseBodyRaw);
      sseContent = consolidateSSEContent(events);
      responseBody = null; // Don't duplicate raw SSE data
    }

    const entry: TraceEntry = {
      id: store.request.id,
      timestamp: store.request.startTime.toISOString(),
      request: {
        method: store.request.method,
        url: store.request.url,
        headers: store.request.headers,
        body: requestBody,
      },
      response: {
        statusCode: store.response.statusCode,
        statusMessage: store.response.statusMessage,
        headers: store.response.headers,
        body: responseBody,
        sseContent,
      },
      timing: {
        startTime: store.request.startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: endTime.getTime() - store.request.startTime.getTime(),
      },
      metadata: {
        isSSE: store.response.isSSE,
      },
    };

    // Extract thread ID from request body if present
    if (requestBody && typeof requestBody === 'object' && requestBody !== null) {
      const parsed = requestBody as Record<string, unknown>;
      if (typeof parsed.thread_id === 'string') {
        entry.metadata.threadId = parsed.thread_id;
      }
    }

    logger.write(entry).catch(err => {
      console.error('[proxy] Failed to write trace:', err.message);
    });

    console.log(`[proxy] Completed ${store.request.method} ${store.request.url} -> ${store.response.statusCode} (${entry.timing.durationMs}ms)`);

    callback();
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[proxy] Shutting down...');
    await logger.close();
    proxy.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return proxy;
}

export async function startProxy(config: ProxyConfig): Promise<void> {
  const proxy = createProxy(config);

  return new Promise((resolve, reject) => {
    proxy.listen({
      port: config.port,
      host: '0.0.0.0',  // Listen on all IPv4 interfaces
      sslCaDir: config.certDir,
      silent: true,  // Suppress library debug output
    } as Parameters<typeof proxy.listen>[0], (err: Error | null | undefined) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(`[proxy] MITM proxy listening on port ${config.port}`);
      console.log(`[proxy] CA certificate: ${config.certDir}/certs/ca.pem`);
      console.log(`[proxy] Traces output: ${config.outputFile}`);
      console.log(`[proxy] Intercepting: ${TARGET_HOSTS.join(', ')}`);
      resolve();
    });
  });
}
