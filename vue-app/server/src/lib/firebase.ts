import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

export function getFirebaseApp(): App {
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
      const serviceAccount = JSON.parse(raw) as object;
      app = initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      });
    }
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    getFirebaseApp();
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
}
