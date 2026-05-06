import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireOwner } from "../middleware/requireOwner.js";
import { loggedFetch } from "../lib/logger.js";
import sql from "../lib/db.js";
import { getDb } from "../lib/firebase.js";
import { getGoogleAccessToken } from "../lib/googleAuth.js";

const router: import("express").Router = Router();
router.use(requireAuth, requireOwner);

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() < hit.expiresAt) return Promise.resolve(hit.data);
  return fn().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

// ── GET /api/usage/neon ───────────────────────────────────────────────────────

const NEON_FREE_LIMIT_BYTES = 512 * 1024 * 1024; // 512 MB free tier

router.get("/neon", async (_req: Request, res: Response) => {
  try {
    const data = await cached("neon", 5 * 60 * 1000, async () => {
      const [sizeRow] = await sql<{ bytes: string }[]>`
        SELECT pg_database_size(current_database()) AS bytes
      `;

      // Storage + live row counts from PostgreSQL stats (no full table scan)
      const tables = await sql<
        {
          table_name: string;
          total_bytes: string;
          table_bytes: string;
          index_bytes: string;
          row_count: string;
        }[]
      >`
        SELECT
          c.relname                            AS table_name,
          pg_total_relation_size(c.oid)::text  AS total_bytes,
          pg_relation_size(c.oid)::text        AS table_bytes,
          pg_indexes_size(c.oid)::text         AS index_bytes,
          COALESCE(s.n_live_tup, 0)::text      AS row_count
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname AND s.schemaname = 'public'
        WHERE c.relkind = 'r' AND n.nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC
      `;

      // 7-day daily insert activity for tables that have a timestamp column
      const [articlesAct, sfClientsAct, sfTokensAct, userTokensAct] =
        await Promise.all([
          sql<{ day: string; count: string }[]>`
          SELECT DATE_TRUNC('day', created_at)::date::text AS day, COUNT(*)::text AS count
          FROM articles WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`,
          sql<{ day: string; count: string }[]>`
          SELECT DATE_TRUNC('day', created_at)::date::text AS day, COUNT(*)::text AS count
          FROM sf_clients WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`,
          sql<{ day: string; count: string }[]>`
          SELECT DATE_TRUNC('day', issued_at)::date::text AS day, COUNT(*)::text AS count
          FROM sf_tokens WHERE issued_at > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`,
          sql<{ day: string; count: string }[]>`
          SELECT DATE_TRUNC('day', updated_at)::date::text AS day, COUNT(*)::text AS count
          FROM user_id_tokens WHERE updated_at > NOW() - INTERVAL '7 days' GROUP BY 1 ORDER BY 1`,
        ]);

      const toActivity = (rows: { day: string; count: string }[]) =>
        rows.map((r) => ({ day: r.day, count: Number(r.count) }));

      const usedBytes = Number(sizeRow.bytes);

      return {
        usedBytes,
        limitBytes: NEON_FREE_LIMIT_BYTES,
        usedPercent: Math.round((usedBytes / NEON_FREE_LIMIT_BYTES) * 100),
        tables: tables.map((t) => ({
          name: t.table_name,
          totalBytes: Number(t.total_bytes),
          tableBytes: Number(t.table_bytes),
          indexBytes: Number(t.index_bytes),
          rowCount: Number(t.row_count),
        })),
        activity: [
          {
            table: "articles",
            label: "Articles",
            color: "#60a5fa",
            days: toActivity(articlesAct),
          },
          {
            table: "sf_clients",
            label: "SF Clients",
            color: "#34d399",
            days: toActivity(sfClientsAct),
          },
          {
            table: "sf_tokens",
            label: "SF Tokens",
            color: "#f59e0b",
            days: toActivity(sfTokensAct),
          },
          {
            table: "user_id_tokens",
            label: "User ID Tokens",
            color: "#a78bfa",
            days: toActivity(userTokensAct),
          },
        ],
      };
    });

    res.json(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch Neon usage";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/usage/fly ────────────────────────────────────────────────────────

const FLY_PROM_BASE = `https://api.fly.io/prometheus/${process.env.FLY_ORG_SLUG ?? "suman-gummalla"}`;
const FLY_APP = process.env.FLY_APP_NAME ?? "sgummalla-net";

async function promQuery(metric: string): Promise<number | null> {
  const token = process.env.FLY_API_TOKEN;
  if (!token) return null;
  try {
    const url = `${FLY_PROM_BASE}/api/v1/query?query=${encodeURIComponent(metric)}`;
    const res = await loggedFetch(
      url,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      `Fly.io Prometheus — ${metric}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data: { result: Array<{ value: [number, string] }> };
    };
    const result = json.data?.result?.[0];
    return result ? parseFloat(result.value[1]) : null;
  } catch {
    return null;
  }
}

router.get("/fly", async (_req: Request, res: Response) => {
  const token = process.env.FLY_API_TOKEN;
  if (!token) {
    res.status(503).json({ error: "FLY_API_TOKEN not configured" });
    return;
  }

  try {
    const data = await cached("fly", 60 * 1000, async () => {
      const app = FLY_APP;
      const [cpuUser, memTotal, memAvailable, netSent, netRecv, httpCount] =
        await Promise.all([
          promQuery(
            `avg(rate(fly_instance_cpu{app="${app}",state="user"}[5m])) * 100`,
          ),
          promQuery(`avg(fly_instance_memory_mem_total{app="${app}"})`),
          promQuery(`avg(fly_instance_memory_mem_available{app="${app}"})`),
          promQuery(
            `sum(increase(fly_instance_net_sent_bytes{app="${app}"}[24h]))`,
          ),
          promQuery(
            `sum(increase(fly_instance_net_recv_bytes{app="${app}"}[24h]))`,
          ),
          promQuery(
            `sum(increase(fly_edge_http_responses_count{app="${app}"}[24h]))`,
          ),
        ]);

      const memUsed =
        memTotal != null && memAvailable != null
          ? memTotal - memAvailable
          : null;

      return {
        app,
        billingUrl: `https://fly.io/dashboard/${process.env.FLY_ORG_SLUG ?? "suman-gummalla"}/billing`,
        cpu: {
          userPercent: cpuUser != null ? Math.round(cpuUser * 10) / 10 : null,
        },
        memory: {
          usedBytes: memUsed != null ? Math.round(memUsed) : null,
          totalBytes: memTotal != null ? Math.round(memTotal) : null,
        },
        network: {
          sentBytes24h: netSent != null ? Math.round(netSent) : null,
          recvBytes24h: netRecv != null ? Math.round(netRecv) : null,
        },
        http: {
          requests24h: httpCount != null ? Math.round(httpCount) : null,
        },
      };
    });

    res.json(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch Fly.io usage";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/usage/firestore ──────────────────────────────────────────────────

const LOG_TYPES = [
  { logType: "apiin", label: "API Incoming", color: "#60a5fa" },
  { logType: "apiout", label: "API Outgoing", color: "#818cf8" },
  { logType: "pageview", label: "Page Views", color: "#34d399" },
  { logType: "blogview", label: "Blog Views", color: "#a78bfa" },
  { logType: "artview", label: "Article Views", color: "#f472b6" },
  { logType: "authevent", label: "Auth Events", color: "#f59e0b" },
  { logType: "sfop", label: "SF Ops", color: "#fb923c" },
  { logType: "apperror", label: "App Errors", color: "#f87171" },
];

const FREE_READS_PER_DAY = 50_000;
const FREE_WRITES_PER_DAY = 20_000;
const FREE_STORAGE_BYTES = 1 * 1024 * 1024 * 1024;
const FS_PROJECT_ID = "sgummallaworks";
const MONITORING_SCOPE = "https://www.googleapis.com/auth/monitoring.read";

type DailyPoint = { day: string; count: number };

async function monitoringTimeSeries(
  projectId: string,
  token: string,
  metricType: string,
  aligner: "ALIGN_SUM" | "ALIGN_MEAN",
): Promise<DailyPoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 8 * 86_400_000);

  const params = new URLSearchParams({
    filter: `metric.type="${metricType}"`,
    "interval.startTime": start.toISOString(),
    "interval.endTime": end.toISOString(),
    "aggregation.alignmentPeriod": "86400s",
    "aggregation.perSeriesAligner": aligner,
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
    "aggregation.groupByFields": "resource.labels.project_id",
  });

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return []; // metric not yet available for this project
  if (!res.ok)
    throw new Error(
      `Monitoring ${metricType} → HTTP ${res.status}: ${await res.text()}`,
    );

  const json = (await res.json()) as {
    timeSeries?: Array<{
      points: Array<{
        interval: { startTime: string };
        value: { int64Value?: string; doubleValue?: number };
      }>;
    }>;
  };

  const series = json.timeSeries?.[0];
  if (!series?.points?.length) return [];

  return series.points
    .map((p) => ({
      day: p.interval.startTime.slice(0, 10),
      count: Number(p.value.int64Value ?? p.value.doubleValue ?? 0),
    }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-7);
}

router.get("/firestore", async (_req: Request, res: Response) => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" });
    return;
  }

  try {
    const data = await cached("firestore", 5 * 60 * 1000, async () => {
      const db = getDb();
      const { Timestamp } = await import("firebase-admin/firestore");

      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - (6 - i),
          ),
        );
        return d.toISOString().slice(0, 10);
      });
      const sevenDaysAgo = new Date(last7Days[0] + "T00:00:00Z");

      // Per-logType total counts (parallel, each uses single-field equality index)
      const countMap = new Map<string, number | null>();
      await Promise.all(
        LOG_TYPES.map(async ({ logType }) => {
          try {
            const snap = await db
              .collection("logs")
              .where("logType", "==", logType)
              .count()
              .get();
            countMap.set(logType, snap.data().count);
          } catch {
            countMap.set(logType, null);
          }
        }),
      );

      // 7-day activity: single date-range query, group by logType + day in memory
      const actByType = new Map<string, Map<string, number>>();
      try {
        const snap = await db
          .collection("logs")
          .where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
          .get();
        for (const doc of snap.docs) {
          const d = doc.data() as {
            logType?: string;
            createdAt?: { toDate: () => Date };
          };
          const lt = d.logType;
          const day = d.createdAt?.toDate()?.toISOString().slice(0, 10) ?? "";
          if (!lt || !day) continue;
          if (!actByType.has(lt)) actByType.set(lt, new Map());
          const m = actByType.get(lt)!;
          m.set(day, (m.get(day) ?? 0) + 1);
        }
      } catch {
        /* empty */
      }

      const logTypes = LOG_TYPES.map(({ logType, label, color }) => ({
        logType,
        label,
        color,
        count: countMap.get(logType) ?? null,
        activity: last7Days.map((day) => ({
          day,
          count: actByType.get(logType)?.get(day) ?? 0,
        })),
      }));

      const totalDocuments = logTypes.reduce(
        (sum, t) => sum + (t.count ?? 0),
        0,
      );

      const dailyWrites = last7Days.map((day) => ({
        day,
        count: logTypes.reduce(
          (sum, t) => sum + (t.activity.find((a) => a.day === day)?.count ?? 0),
          0,
        ),
      }));

      // Cloud Monitoring — reads and storage (requires GCP billing)
      let dailyReads: DailyPoint[] = [];
      let usedStorageBytes: number | null = null;
      let monitoringError: string | null = null;

      try {
        const token = await getGoogleAccessToken(MONITORING_SCOPE);
        const [reads, storage] = await Promise.all([
          monitoringTimeSeries(
            FS_PROJECT_ID,
            token,
            "firestore.googleapis.com/document/read_count",
            "ALIGN_SUM",
          ),
          monitoringTimeSeries(
            FS_PROJECT_ID,
            token,
            "firestore.googleapis.com/storage/total_bytes",
            "ALIGN_MEAN",
          ),
        ]);
        dailyReads = reads;
        if (storage.length > 0)
          usedStorageBytes = storage[storage.length - 1].count;
      } catch (err) {
        monitoringError =
          err instanceof Error ? err.message : "Monitoring unavailable";
      }

      return {
        projectId: FS_PROJECT_ID,
        consoleUrl: `https://console.firebase.google.com/project/${FS_PROJECT_ID}/firestore`,
        logTypes,
        totalDocuments,
        ttlDays: 30,
        usedStorageBytes,
        dailyReads,
        dailyWrites,
        monitoringError,
        freeTier: {
          readsPerDay: FREE_READS_PER_DAY,
          writesPerDay: FREE_WRITES_PER_DAY,
          storageLimitBytes: FREE_STORAGE_BYTES,
        },
      };
    });

    res.json(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch Firestore usage";
    res.status(500).json({ error: msg });
  }
});

// ── GET /api/usage/blog ───────────────────────────────────────────────────────

const BLOG_PALETTE = [
  "#60a5fa",
  "#f59e0b",
  "#34d399",
  "#a78bfa",
  "#f87171",
  "#fb923c",
  "#e879f9",
  "#2dd4bf",
  "#facc15",
  "#818cf8",
];

function slugToColor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++)
    h = (h * 31 + slug.charCodeAt(i)) & 0x7fffffff;
  return BLOG_PALETTE[h % BLOG_PALETTE.length];
}

router.get("/blog", async (_req: Request, res: Response) => {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" });
    return;
  }

  try {
    const data = await cached("blog", 5 * 60 * 1000, async () => {
      const db = getDb();
      const { Timestamp } = await import("firebase-admin/firestore");

      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - (6 - i),
          ),
        );
        return d.toISOString().slice(0, 10);
      });

      const sevenDaysAgo = new Date(last7Days[0] + "T00:00:00Z");

      // Single range filter on unified logs collection — avoids composite index
      const snap = await db
        .collection("logs")
        .where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
        .get();

      // Aggregate artview events by slug + day
      const bySlug = new Map<
        string,
        { title: string; days: Map<string, number> }
      >();

      for (const doc of snap.docs) {
        const d = doc.data() as Record<string, unknown>;
        if (d["logType"] !== "artview") continue;

        const data = d["data"] as Record<string, unknown> | undefined;
        const slug = data?.["articleSlug"] as string | undefined;
        const title =
          (data?.["articleTitle"] as string | undefined) ?? slug ?? "Unknown";
        if (!slug) continue;

        const ts = d["createdAt"] as { toDate?: () => Date } | undefined;
        const day = ts?.toDate?.()?.toISOString().slice(0, 10) ?? "";
        if (!day || !last7Days.includes(day)) continue;

        if (!bySlug.has(slug)) bySlug.set(slug, { title, days: new Map() });
        const entry = bySlug.get(slug)!;
        entry.days.set(day, (entry.days.get(day) ?? 0) + 1);
      }

      const series = Array.from(bySlug.entries())
        .map(([slug, { title, days }]) => ({
          slug,
          title,
          color: slugToColor(slug),
          total: last7Days.reduce((sum, d) => sum + (days.get(d) ?? 0), 0),
          days: last7Days.map((d) => ({ day: d, count: days.get(d) ?? 0 })),
        }))
        .sort((a, b) => b.total - a.total)
        .map((s, i) => ({ ...s, id: `A${i + 1}` }));

      return {
        series,
        totalViews: series.reduce((sum, s) => sum + s.total, 0),
      };
    });

    res.json(data);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch blog usage";
    res.status(500).json({ error: msg });
  }
});

export default router;
