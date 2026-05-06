import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { LogRecord, LogSink } from "../logTypes.js";

export class FileSink implements LogSink {
  name = "file";

  constructor(private readonly logsDir: string) {
    mkdirSync(logsDir, { recursive: true });
  }

  write(record: LogRecord): void {
    const day = new Date().toISOString().slice(0, 10);
    const path = join(this.logsDir, `${day}.log`);
    appendFileSync(path, JSON.stringify(record) + "\n", "utf8");
  }
}
