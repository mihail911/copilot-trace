#!/usr/bin/env node

import { program } from 'commander';
import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProxy } from './proxy.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const defaultCertDir = resolve(__dirname, '..', 'certs');
const defaultTracesDir = resolve(__dirname, '..', 'traces');
const DEFAULT_PORT = 8899;

program
  .name('copilot-trace')
  .description('Capture GitHub Copilot CLI requests and responses')
  .version('1.0.0')
  .option('--port <port>', 'Proxy port', String(DEFAULT_PORT))
  .option('-o, --output <file>', 'Output JSONL file', join(defaultTracesDir, 'copilot-trace.jsonl'))
  .option('-c, --cert-dir <dir>', 'Certificate directory', defaultCertDir)
  .option('-s, --standalone', 'Run in standalone proxy mode (no command wrapper)')
  .argument('[command...]', 'Command to run with proxy (wrapper mode)')
  .allowUnknownOption(true)
  .passThroughOptions(true)
  .action(async (commandArgs: string[], options) => {
    const port = parseInt(options.port, 10);
    const outputFile = resolve(options.output);
    const certDir = resolve(options.certDir);

    const config = {
      port,
      outputFile,
      certDir,
      targetHosts: ['api.githubcopilot.com', 'api.individual.githubcopilot.com'],
    };

    if (options.standalone || commandArgs.length === 0) {
      // Standalone mode: just start the proxy
      console.log('[copilot-trace] Starting in standalone mode');
      console.log('[copilot-trace] Set these environment variables in another terminal:');
      console.log(`  export HTTPS_PROXY=http://127.0.0.1:${port}`);
      console.log(`  export SSL_CERT_FILE=${certDir}/certs/ca.pem`);
      console.log('');

      await startProxy(config);
    } else {
      // Wrapper mode: start proxy and run command
      console.log('[copilot-trace] Starting in wrapper mode');

      await startProxy(config);

      const [cmd, ...args] = commandArgs;
      const caCertPath = join(certDir, 'certs', 'ca.pem');

      console.log(`[copilot-trace] Running: ${cmd} ${args.join(' ')}`);
      console.log('');

      const childEnv: Record<string, string | undefined> = {
        ...process.env,
        HTTPS_PROXY: `http://127.0.0.1:${port}`,
        HTTP_PROXY: `http://127.0.0.1:${port}`,
        SSL_CERT_FILE: caCertPath,
        NODE_EXTRA_CA_CERTS: caCertPath,
        // Bypass proxy for GitHub auth endpoints
        NO_PROXY: 'github.com,api.github.com',
        // Allow self-signed certs from MITM proxy
        NODE_TLS_REJECT_UNAUTHORIZED: '0',
      };


      const child = spawn(cmd, args, {
        stdio: 'inherit',
        env: childEnv,
      });

      child.on('error', (err) => {
        console.error(`[copilot-trace] Failed to start command: ${err.message}`);
        process.exit(1);
      });

      child.on('close', (code) => {
        console.log('');
        console.log(`[copilot-trace] Command exited with code ${code}`);
        console.log(`[copilot-trace] Traces written to: ${outputFile}`);
        process.exit(code || 0);
      });
    }
  });

program.parse();
