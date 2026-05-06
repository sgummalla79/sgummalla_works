import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../firebase.js";
import type { LogRecord } from "../logTypes.js";
import type { LogSink } from "../logTypes.js";

export class FirestoreSink implements LogSink {
  name = "firestore";

  constructor(private readonly ttlMs: number) {}

  async write(record: LogRecord): Promise<void> {
    const expireAt = Timestamp.fromDate(new Date(Date.now() + this.ttlMs));
    await getDb()
      .collection("logs")
      .add({
        ...record,
        timestamp: Timestamp.fromDate(record.timestamp),
        createdAt: Timestamp.fromDate(record.createdAt),
        expireAt,
      });
  }
}
