/**
 * One-time migration: copies documents from api_logs, page_views, auth_events,
 * sf_ops into the unified 'logs' collection with a 30-day expireAt, then
 * deletes the originals.
 *
 * Run from the server directory:
 *   pnpm migrate:logs
 */

import "dotenv/config";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldPath } from "firebase-admin/firestore";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 400;
const OLD_COLLECTIONS = ["api_logs", "page_views", "auth_events", "sf_ops"];

// ── Init ──────────────────────────────────────────────────────────────────────

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error("FIREBASE_SERVICE_ACCOUNT not set");
  process.exit(1);
}

const app = initializeApp({
  credential: cert(JSON.parse(raw) as ServiceAccount),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

// ── Migration ─────────────────────────────────────────────────────────────────

async function migrateCollection(
  name: string,
): Promise<{ migrated: number; expired: number }> {
  let migrated = 0;
  let expired = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  process.stdout.write(`  ${name.padEnd(14)}`);

  for (;;) {
    let q = db
      .collection(name)
      .orderBy(FieldPath.documentId())
      .limit(BATCH_SIZE);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    const now = Date.now();
    const toMigrate: FirebaseFirestore.DocumentData[] = [];
    const toDelete: FirebaseFirestore.DocumentReference[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();

      // Recalculate expireAt from createdAt + 30 days
      const createdMs =
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().getTime()
          : now;
      const newExpireAt = new Date(createdMs + TTL_MS);

      toDelete.push(doc.ref);

      if (newExpireAt.getTime() <= now) {
        expired++; // already past 30 days — delete without copying
        continue;
      }

      toMigrate.push({ ...data, expireAt: Timestamp.fromDate(newExpireAt) });
      migrated++;
    }

    // Write copies to logs
    if (toMigrate.length > 0) {
      const wb = db.batch();
      for (const data of toMigrate) wb.set(db.collection("logs").doc(), data);
      await wb.commit();
    }

    // Delete originals
    if (toDelete.length > 0) {
      const wb = db.batch();
      for (const ref of toDelete) wb.delete(ref);
      await wb.commit();
    }

    process.stdout.write(`${migrated + expired}…`);
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BATCH_SIZE) break;
  }

  console.log(` done  (${migrated} migrated, ${expired} already expired)`);
  return { migrated, expired };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\nMigrating Firestore logs → single 'logs' collection\n");

  let totalMigrated = 0;
  let totalExpired = 0;

  for (const col of OLD_COLLECTIONS) {
    const { migrated, expired } = await migrateCollection(col);
    totalMigrated += migrated;
    totalExpired += expired;
  }

  console.log(
    `\n✓  Total: ${totalMigrated} migrated, ${totalExpired} expired docs deleted.\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
