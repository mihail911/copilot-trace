import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { TraceEntry } from './types.js';

export class JsonlLogger {
  private stream: WriteStream | null = null;
  private outputPath: string;
  private ready: Promise<void>;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
    this.ready = this.initialize();
  }

  private async initialize(): Promise<void> {
    const dir = dirname(this.outputPath);
    await mkdir(dir, { recursive: true });
    this.stream = createWriteStream(this.outputPath, { flags: 'a' });
  }

  async write(entry: TraceEntry): Promise<void> {
    await this.ready;
    if (!this.stream) {
      throw new Error('Logger not initialized');
    }

    return new Promise((resolve, reject) => {
      const line = JSON.stringify(entry) + '\n';
      this.stream!.write(line, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    await this.ready;
    if (this.stream) {
      return new Promise((resolve) => {
        this.stream!.end(() => {
          this.stream = null;
          resolve();
        });
      });
    }
  }
}
