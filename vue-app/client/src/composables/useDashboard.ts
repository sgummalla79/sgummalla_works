import { ref, computed } from "vue";
import {
  fetchNeonUsage,
  fetchFlyUsage,
  fetchFirestoreUsage,
  fetchBlogUsage,
  type NeonUsage,
  type FlyUsage,
  type FirestoreUsage,
  type BlogUsage,
} from "../api/usage";
import { shortDay } from "../utils/format";

export type DashboardSection = "neon" | "firestore" | "blog" | "fly";

export interface SparkRow {
  key: string;
  label: string;
  id?: string;
  color: string;
  total7d: number;
  counts: Record<string, number>;
}

export interface BarSegment {
  slug: string;
  id: string;
  title: string;
  color: string;
  h: number;
  count: number;
}

export interface StackedBar {
  day: string;
  segments: BarSegment[];
  total: number;
}

function last7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function barPx(count: number, max: number, maxH = 24): number {
  if (count === 0) return 0;
  return Math.max(2, Math.round((count / max) * maxH));
}

export function useDashboard() {
  const active = ref<DashboardSection>("neon");

  const neon = ref<NeonUsage | null>(null);
  const fly = ref<FlyUsage | null>(null);
  const firestore = ref<FirestoreUsage | null>(null);
  const blog = ref<BlogUsage | null>(null);
  const neonErr = ref<string | null>(null);
  const flyErr = ref<string | null>(null);
  const fsErr = ref<string | null>(null);
  const blogErr = ref<string | null>(null);
  const loading = ref(true);
  const lastUpdated = ref<Date | null>(null);

  const SPARK_DAYS = last7Days();

  const neonSparkRows = computed((): SparkRow[] => {
    if (!neon.value?.activity) return [];
    return neon.value.activity.map((s) => {
      const counts: Record<string, number> = {};
      for (const d of s.days) counts[d.day] = d.count;
      const total7d = SPARK_DAYS.reduce(
        (sum, day) => sum + (counts[day] ?? 0),
        0,
      );
      return { key: s.table, label: s.label, color: s.color, total7d, counts };
    });
  });

  const neonSparkMax = computed(() =>
    Math.max(
      1,
      ...neonSparkRows.value.flatMap((r) =>
        SPARK_DAYS.map((d) => r.counts[d] ?? 0),
      ),
    ),
  );

  const fsSparkRows = computed((): SparkRow[] => {
    if (!firestore.value?.logTypes) return [];
    return firestore.value.logTypes.map((t) => {
      const counts: Record<string, number> = {};
      for (const d of t.activity) counts[d.day] = d.count;
      return {
        key: t.logType,
        label: t.label,
        color: t.color,
        total7d: SPARK_DAYS.reduce((sum, day) => sum + (counts[day] ?? 0), 0),
        counts,
      };
    });
  });

  const fsSparkMax = computed(() =>
    Math.max(
      1,
      ...fsSparkRows.value.flatMap((r) =>
        SPARK_DAYS.map((d) => r.counts[d] ?? 0),
      ),
    ),
  );

  const fsWritesRow = computed((): SparkRow | null => {
    if (!firestore.value?.dailyWrites.length) return null;
    const counts: Record<string, number> = {};
    for (const d of firestore.value.dailyWrites) counts[d.day] = d.count;
    return {
      key: "total-writes",
      label: "Total writes",
      color: "#34d399",
      total7d: SPARK_DAYS.reduce((s, d) => s + (counts[d] ?? 0), 0),
      counts,
    };
  });

  const fsWritesMax = computed(() => {
    if (!fsWritesRow.value) return 1;
    return Math.max(
      1,
      ...SPARK_DAYS.map((d) => fsWritesRow.value!.counts[d] ?? 0),
    );
  });

  const fsReadsRow = computed((): SparkRow | null => {
    if (!firestore.value?.dailyReads.length) return null;
    const counts: Record<string, number> = {};
    for (const d of firestore.value.dailyReads) counts[d.day] = d.count;
    return {
      key: "reads",
      label: "Reads",
      color: "#60a5fa",
      total7d: SPARK_DAYS.reduce((s, d) => s + (counts[d] ?? 0), 0),
      counts,
    };
  });

  const fsReadsMax = computed(() => {
    if (!fsReadsRow.value) return 1;
    return Math.max(
      1,
      ...SPARK_DAYS.map((d) => fsReadsRow.value!.counts[d] ?? 0),
    );
  });

  const fsStoragePct = computed(() => {
    if (!firestore.value?.usedStorageBytes) return null;
    return Math.round(
      (firestore.value.usedStorageBytes /
        firestore.value.freeTier.storageLimitBytes) *
        100,
    );
  });

  const BLOG_BAR_H = 80;

  const blogChart = computed((): StackedBar[] => {
    if (!blog.value?.series.length) return [];
    const { series } = blog.value;
    const maxTotal = Math.max(
      1,
      ...SPARK_DAYS.map((day) =>
        series.reduce(
          (sum, s) => sum + (s.days.find((d) => d.day === day)?.count ?? 0),
          0,
        ),
      ),
    );
    return SPARK_DAYS.map((day) => {
      const total = series.reduce(
        (sum, s) => sum + (s.days.find((d) => d.day === day)?.count ?? 0),
        0,
      );
      const segments: BarSegment[] = series
        .filter((s) => (s.days.find((d) => d.day === day)?.count ?? 0) > 0)
        .map((s) => ({
          slug: s.slug,
          id: s.id,
          title: s.title,
          color: s.color,
          count: s.days.find((d) => d.day === day)?.count ?? 0,
          h: Math.max(
            2,
            Math.round(
              ((s.days.find((d) => d.day === day)?.count ?? 0) / maxTotal) *
                BLOG_BAR_H,
            ),
          ),
        }));
      return { day, segments, total };
    });
  });

  const blogSparkRows = computed((): SparkRow[] => {
    if (!blog.value?.series) return [];
    return blog.value.series.map((s) => {
      const counts: Record<string, number> = {};
      for (const d of s.days) counts[d.day] = d.count;
      return {
        key: s.slug,
        label: s.title,
        id: s.id,
        color: s.color,
        total7d: s.total,
        counts,
      };
    });
  });

  const blogSparkMax = computed(() =>
    Math.max(
      1,
      ...blogSparkRows.value.flatMap((r) =>
        SPARK_DAYS.map((d) => r.counts[d] ?? 0),
      ),
    ),
  );

  async function load() {
    loading.value = true;
    neonErr.value = flyErr.value = fsErr.value = blogErr.value = null;

    const [nr, fr, fsr, br] = await Promise.allSettled([
      fetchNeonUsage(),
      fetchFlyUsage(),
      fetchFirestoreUsage(),
      fetchBlogUsage(),
    ]);

    neon.value = nr.status === "fulfilled" ? nr.value : null;
    fly.value = fr.status === "fulfilled" ? fr.value : null;
    firestore.value = fsr.status === "fulfilled" ? fsr.value : null;
    blog.value = br.status === "fulfilled" ? br.value : null;
    if (nr.status === "rejected")
      neonErr.value = nr.reason instanceof Error ? nr.reason.message : "Failed";
    if (fr.status === "rejected")
      flyErr.value = fr.reason instanceof Error ? fr.reason.message : "Failed";
    if (fsr.status === "rejected")
      fsErr.value = fsr.reason instanceof Error ? fsr.reason.message : "Failed";
    if (br.status === "rejected")
      blogErr.value = br.reason instanceof Error ? br.reason.message : "Failed";

    loading.value = false;
    lastUpdated.value = new Date();
  }

  return {
    active,
    neon,
    fly,
    firestore,
    blog,
    neonErr,
    flyErr,
    fsErr,
    blogErr,
    loading,
    lastUpdated,
    SPARK_DAYS,
    neonSparkRows,
    neonSparkMax,
    fsSparkRows,
    fsSparkMax,
    fsWritesRow,
    fsWritesMax,
    fsReadsRow,
    fsReadsMax,
    fsStoragePct,
    blogChart,
    blogSparkRows,
    blogSparkMax,
    load,
    shortDay,
  };
}
