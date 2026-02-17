const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'cookie',
  'set-cookie',
  'x-request-id',
  'x-github-token',
  'x-copilot-token',
]);

export function redactHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;

    const headerValue = Array.isArray(value) ? value.join(', ') : value;
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_HEADERS.has(lowerKey)) {
      result[key] = redactValue(headerValue);
    } else {
      result[key] = headerValue;
    }
  }

  return result;
}

function redactValue(value: string): string {
  if (value.length <= 12) {
    return '[REDACTED]';
  }
  const prefix = value.slice(0, 4);
  const suffix = value.slice(-4);
  return `${prefix}...${suffix}`;
}
