import type { LogRecord, LogSink } from "../logTypes.js";

export class ConsoleSink implements LogSink {
  name = "console";

  write(record: LogRecord): void {
    const d = record.data as unknown as Record<string, unknown>;
    const method = (d["method"] as string | undefined) ?? "";
    const url = (d["url"] as string | undefined) ?? "";
    const status = (d["status"] as number | undefined) ?? "";
    const duration = d["durationMs"] as number | undefined;
    const ctx = (d["context"] as string | undefined) ?? "";
    const sid = record.sessionId.slice(0, 8);
    const arrow =
      record.logType === "apiin"
        ? "→"
        : record.logType === "apiout"
          ? "↗"
          : "•";
    const dur = duration != null ? ` ${duration}ms` : "";
    const ctxStr = ctx ? ` — ${ctx}` : "";
    const line = `[${record.timestamp.toISOString()}] [${record.level.toUpperCase()}] [${record.logType}] [${sid}] ${arrow} ${method} ${url} ${status}${dur}${ctxStr}`;
    if (record.level === "error") console.error(line);
    else if (record.level === "warn") console.warn(line);
    else console.log(line);
  }
}
