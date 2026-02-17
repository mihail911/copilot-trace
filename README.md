# copilot-trace

Capture GitHub Copilot CLI requests and responses using an HTTP/HTTPS MITM proxy.

This tool intercepts and logs all API traffic between the GitHub Copilot CLI and GitHub's servers, making it useful for debugging, research, and understanding how Copilot works under the hood.

## Features

- **MITM Proxy**: Intercepts HTTPS traffic to GitHub Copilot API endpoints
- **Automatic Certificate Generation**: Creates CA certificates on first run
- **SSE Parsing**: Properly handles Server-Sent Events and extracts content
- **JSONL Output**: Logs all requests/responses in JSONL format for easy processing
- **Header Redaction**: Automatically redacts sensitive headers (Authorization, API keys, etc.)
- **Wrapper & Standalone Modes**: Run commands through the proxy or use it as a standalone proxy server

## Requirements

- Node.js 18.0.0 or higher
- GitHub CLI (`gh`) with Copilot extension installed
- A GitHub Copilot subscription

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/copilot-trace.git
cd copilot-trace

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Wrapper Mode (Recommended)

Run a GitHub Copilot command through the proxy. The tool automatically sets up the environment:

```bash
# Set auth token (required for gh copilot)
export COPILOT_GITHUB_TOKEN=$(gh auth token)

# Basic usage - capture a simple query
npx copilot-trace gh copilot explain "git log --oneline"

# Custom output file
npx copilot-trace -o my-traces.jsonl gh copilot suggest "find large files"

# Custom port
npx copilot-trace --port 9000 gh copilot explain "docker build"
```

### Standalone Mode

Start the proxy server in one terminal, then run commands in another:

```bash
# Terminal 1: Start the proxy
npx copilot-trace --standalone

# Terminal 2: Configure environment and run commands
export HTTPS_PROXY=http://127.0.0.1:8899
export SSL_CERT_FILE=./certs/certs/ca.pem
export COPILOT_GITHUB_TOKEN=$(gh auth token)
gh copilot explain "ls -la"
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port <port>` | Proxy port | 8899 |
| `-o, --output <file>` | Output JSONL file | traces/copilot-trace.jsonl |
| `-c, --cert-dir <dir>` | Certificate directory | certs/ |
| `-s, --standalone` | Run in standalone proxy mode | false |

## Authentication

The `gh copilot` CLI requires a GitHub token. Set one of these environment variables before running:

```bash
# Recommended: use gh CLI's token
export COPILOT_GITHUB_TOKEN=$(gh auth token)

# Alternatives
export GH_TOKEN=$(gh auth token)
export GITHUB_TOKEN=$(gh auth token)
```

## Output Format

Traces are written as JSONL (one JSON object per line). Each entry contains:

```json
{
  "id": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "request": {
    "method": "POST",
    "url": "https://api.githubcopilot.com/...",
    "headers": { "...": "..." },
    "body": { "...": "..." }
  },
  "response": {
    "statusCode": 200,
    "statusMessage": "OK",
    "headers": { "...": "..." },
    "body": { "...": "..." },
    "sseContent": "Consolidated response text from SSE stream"
  },
  "timing": {
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-01-01T00:00:01.000Z",
    "durationMs": 1000
  },
  "metadata": {
    "isSSE": true,
    "threadId": "..."
  }
}
```

## Certificate Trust

The proxy generates a CA certificate on first run in the `certs/` directory. For the `gh copilot` CLI to trust it, you can use one of these methods:

### Option 1: Environment Variable (Automatic in Wrapper Mode)

In wrapper mode, this is set automatically. For standalone mode:

```bash
export SSL_CERT_FILE=./certs/certs/ca.pem
```

### Option 2: System Keychain (macOS)

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ./certs/certs/ca.pem
```

### Option 3: System Trust Store (Linux)

```bash
sudo cp ./certs/certs/ca.pem /usr/local/share/ca-certificates/copilot-trace-ca.crt
sudo update-ca-certificates
```

## Viewing Traces

```bash
# Pretty print all traces
cat traces/copilot-trace.jsonl | jq .

# View just the SSE content (the actual responses)
cat traces/copilot-trace.jsonl | jq '.response.sseContent'

# Extract request bodies
cat traces/copilot-trace.jsonl | jq '.request.body'

# Filter by URL pattern
cat traces/copilot-trace.jsonl | jq 'select(.request.url | contains("/chat/completions"))'

# Show timing information
cat traces/copilot-trace.jsonl | jq '{url: .request.url, duration: .timing.durationMs}'
```

## Examples

The `examples/` directory contains extracted prompts and tool definitions from GitHub Copilot CLI:

- `copilot_system_prompt.md` - Main system prompt
- `copilot_compaction_prompt.md` - Context compaction prompt
- `copilot_plan_prompt.md` - Planning mode prompt
- `copilot_tools_list.md` - Available tools (human-readable)
- `tools.json` - Tool definitions (JSON format)

## How It Works

1. **Proxy Setup**: The tool starts an HTTP/HTTPS MITM proxy using `http-mitm-proxy`
2. **Certificate Generation**: On first run, generates a CA certificate in `certs/`
3. **Traffic Interception**: Intercepts requests to `api.githubcopilot.com` and `api.individual.githubcopilot.com`
4. **SSE Handling**: Parses Server-Sent Events streams and consolidates content
5. **Logging**: Writes structured JSONL entries with request/response data

## Security Notes

- **Sensitive headers are redacted**: Authorization, cookies, API keys, and tokens are automatically redacted in traces
- **Private keys are local**: The CA certificate and private key are stored in `certs/` (gitignored)
- **Traces may contain sensitive data**: Your queries and Copilot's responses are logged - handle trace files appropriately
- **Do not commit traces**: The `.gitignore` excludes trace files by default

## Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Run directly
npm start -- gh copilot explain "hello world"
```

## Troubleshooting

### "Certificate not trusted" errors

Make sure `SSL_CERT_FILE` points to the correct CA certificate path, or add it to your system trust store.

### "Connection refused" errors

Ensure no other process is using port 8899 (or your custom port), and that the proxy is running.

### No traces being captured

Check that you're targeting GitHub Copilot endpoints. The proxy only intercepts traffic to:
- `api.githubcopilot.com`
- `api.individual.githubcopilot.com`

## License

MIT - See [LICENSE](LICENSE) for details.

## Disclaimer

This tool is for educational and debugging purposes. Use responsibly and in accordance with GitHub's Terms of Service.
