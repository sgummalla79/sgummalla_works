<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../stores/auth";
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

const router = useRouter();
const auth = useAuthStore();

type Section = "neon" | "firestore" | "blog" | "fly";
const active = ref<Section>("neon");

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

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fmtNum(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDay(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

// ── Sparkline table ───────────────────────────────────────────────────────────

interface SparkRow {
  key: string;
  label: string;
  id?: string;
  color: string;
  total7d: number;
  counts: Record<string, number>;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
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

const SPARK_DAYS = last7Days();

function barPx(count: number, max: number, maxH = 24): number {
  if (count === 0) return 0;
  return Math.max(2, Math.round((count / max) * maxH));
}

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

// ── Blog stacked bar chart ────────────────────────────────────────────────────

interface BarSegment {
  slug: string;
  id: string;
  title: string;
  color: string;
  h: number;
  count: number;
}
interface StackedBar {
  day: string;
  segments: BarSegment[];
  total: number;
}

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

// ── Load ─────────────────────────────────────────────────────────────────────

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

onMounted(load);
</script>

<template>
  <AppLayout
    active-page=""
    :is-owner="auth.isOwner"
    :is-authenticated="auth.isAuthenticated"
    :user-name="auth.fullName"
    :user-email="auth.email"
    :scrollable="true"
    @logout="handleLogout"
    @profile="router.push({ name: 'profile' })"
    @usage="router.push({ name: 'dashboard' })"
  >
    <div class="vz-dash">
      <!-- Page header -->
      <div class="vz-dash__top">
        <div>
          <h1 class="vz-dash__title">Usage Dashboard</h1>
          <p class="vz-dash__sub">Infrastructure usage for sgummalla.net</p>
        </div>
        <div class="vz-dash__actions">
          <p v-if="lastUpdated" class="vz-dash__updated">
            Updated {{ lastUpdated.toLocaleTimeString() }}
          </p>
          <button class="vz-dash__refresh" @click="load">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div class="vz-dash__layout">
        <!-- Side nav -->
        <nav class="vz-dash__sidenav">
          <button
            v-for="item in [
              { key: 'neon', label: 'NeonDB', color: '#00e5a0' },
              { key: 'firestore', label: 'Firestore', color: '#ffca28' },
              { key: 'blog', label: 'Blog', color: '#f472b6' },
              { key: 'fly', label: 'Fly.io', color: '#8b5cf6' },
            ]"
            :key="item.key"
            class="vz-dash__navitem"
            :class="{ 'vz-dash__navitem--active': active === item.key }"
            @click="active = item.key as Section"
          >
            <span class="vz-dash__navdot" :style="{ background: item.color }" />
            {{ item.label }}
          </button>
        </nav>

        <!-- Main content -->
        <div class="vz-dash__content">
          <!-- ── NeonDB ──────────────────────────────────── -->
          <div v-if="active === 'neon'" class="vz-dash__panel">
            <div class="vz-dash__panel-header">
              <div class="vz-dash__panel-title-row">
                <svg
                  class="vz-dash__panel-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: #00e5a0"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  />
                  <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />
                </svg>
                <span class="vz-dash__panel-title">NeonDB</span>
                <span class="vz-dash__panel-badge"
                  >PostgreSQL · Free Tier · 512 MB limit</span
                >
              </div>
            </div>

            <div v-if="loading" class="vz-dash__loading">Loading…</div>
            <div v-else-if="neonErr" class="vz-dash__error">{{ neonErr }}</div>
            <template v-else-if="neon">
              <!-- Storage bar -->
              <div class="vz-dash__section">
                <p class="vz-dash__section-title">Storage</p>
                <div class="vz-dash__bar-header">
                  <span class="vz-dash__bar-label">Used</span>
                  <span class="vz-dash__bar-value"
                    >{{ fmt(neon.usedBytes) }} /
                    {{ fmt(neon.limitBytes) }}</span
                  >
                </div>
                <div class="vz-dash__bar-track">
                  <div
                    class="vz-dash__bar-fill"
                    :class="
                      neon.usedPercent > 80 ? 'vz-dash__bar-fill--warn' : ''
                    "
                    :style="{ width: `${Math.min(neon.usedPercent, 100)}%` }"
                  />
                </div>
                <p class="vz-dash__bar-pct">{{ neon.usedPercent }}% used</p>
              </div>

              <!-- Table breakdown -->
              <div class="vz-dash__section">
                <p class="vz-dash__section-title">Tables</p>
                <table class="vz-dash__table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th class="vz-dash__tc">Rows</th>
                      <th class="vz-dash__tc">Total size</th>
                      <th class="vz-dash__tc">Data</th>
                      <th class="vz-dash__tc">Indexes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in neon.tables" :key="t.name">
                      <td class="vz-dash__tname">{{ t.name }}</td>
                      <td class="vz-dash__tc">{{ fmtNum(t.rowCount) }}</td>
                      <td class="vz-dash__tc">{{ fmt(t.totalBytes) }}</td>
                      <td class="vz-dash__tc vz-dash__tdim">
                        {{ fmt(t.tableBytes) }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">
                        {{ fmt(t.indexBytes) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 7-day sparkline activity -->
              <div v-if="neonSparkRows.length" class="vz-dash__section">
                <p class="vz-dash__section-title">
                  Records created — last 7 days
                </p>
                <table class="vz-spark">
                  <thead>
                    <tr>
                      <th class="vz-spark__th-name">Table</th>
                      <th class="vz-spark__th-total">7d total</th>
                      <th
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__th-day"
                      >
                        {{ shortDay(day) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in neonSparkRows" :key="row.key">
                      <td class="vz-spark__td-name">
                        <div class="vz-spark__name-inner">
                          <span
                            class="vz-spark__dot"
                            :style="{ background: row.color }"
                          />
                          {{ row.label }}
                        </div>
                      </td>
                      <td class="vz-spark__td-total">{{ row.total7d }}</td>
                      <td
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__td-day"
                        :data-tip="`${shortDay(day)}: ${row.counts[day] ?? 0}`"
                      >
                        <div class="vz-spark__bar-wrap">
                          <div
                            class="vz-spark__bar"
                            :style="{
                              height: `${barPx(row.counts[day] ?? 0, neonSparkMax)}px`,
                              background: row.color,
                            }"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>

          <!-- ── Firestore ───────────────────────────────── -->
          <div v-else-if="active === 'firestore'" class="vz-dash__panel">
            <div class="vz-dash__panel-header">
              <div class="vz-dash__panel-title-row">
                <svg
                  class="vz-dash__panel-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: #ffca28"
                >
                  <path
                    d="M6.5 2h11L21 8.5 12 22 3 8.5 6.5 2zm1.25 2L5.2 8h13.6l-2.55-4H7.75zM12 18.5l7-9H5l7 9z"
                  />
                </svg>
                <span class="vz-dash__panel-title">Firestore</span>
                <span class="vz-dash__panel-badge"
                  >sgummallaworks · logs · {{ firestore?.ttlDays ?? 30 }}-day
                  retention</span
                >
              </div>
            </div>

            <div v-if="loading" class="vz-dash__loading">Loading…</div>
            <div v-else-if="fsErr" class="vz-dash__error">{{ fsErr }}</div>
            <template v-else-if="firestore">
              <!-- Storage bar -->
              <div
                v-if="
                  fsStoragePct !== null && firestore.usedStorageBytes !== null
                "
                class="vz-dash__section"
              >
                <p class="vz-dash__section-title">Storage</p>
                <div class="vz-dash__bar-header">
                  <span class="vz-dash__bar-label">Used</span>
                  <span class="vz-dash__bar-value"
                    >{{ fmt(firestore.usedStorageBytes) }} /
                    {{ fmt(firestore.freeTier.storageLimitBytes) }}</span
                  >
                </div>
                <div class="vz-dash__bar-track">
                  <div
                    class="vz-dash__bar-fill"
                    :class="fsStoragePct > 80 ? 'vz-dash__bar-fill--warn' : ''"
                    :style="{
                      width: `${Math.min(fsStoragePct, 100)}%`,
                      background: '#ffca28',
                    }"
                  />
                </div>
                <p class="vz-dash__bar-pct">{{ fsStoragePct }}% used</p>
              </div>

              <!-- Log type breakdown -->
              <div class="vz-dash__section">
                <p class="vz-dash__section-title">
                  Log types — {{ fmtNum(firestore.totalDocuments) }} total
                  documents
                </p>
                <table class="vz-dash__table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th class="vz-dash__tc">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="t in firestore.logTypes" :key="t.logType">
                      <td class="vz-dash__tname">
                        <span
                          class="vz-dash__tname-dot"
                          :style="{ background: t.color }"
                        />
                        {{ t.label }}
                      </td>
                      <td class="vz-dash__tc">
                        {{ t.count !== null ? fmtNum(t.count) : "—" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Writes per day — per log type + total row -->
              <div v-if="fsSparkRows.length" class="vz-dash__section">
                <p class="vz-dash__section-title">Writes — last 7 days</p>
                <table class="vz-spark">
                  <thead>
                    <tr>
                      <th class="vz-spark__th-name">Log type</th>
                      <th class="vz-spark__th-total">7d total</th>
                      <th
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__th-day"
                      >
                        {{ shortDay(day) }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in fsSparkRows" :key="row.key">
                      <td class="vz-spark__td-name">
                        <div class="vz-spark__name-inner">
                          <span
                            class="vz-spark__dot"
                            :style="{ background: row.color }"
                          />
                          {{ row.label }}
                        </div>
                      </td>
                      <td class="vz-spark__td-total">{{ row.total7d }}</td>
                      <td
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__td-day"
                        :data-tip="`${shortDay(day)}: ${row.counts[day] ?? 0}`"
                      >
                        <div class="vz-spark__bar-wrap">
                          <div
                            class="vz-spark__bar"
                            :style="{
                              height: `${barPx(row.counts[day] ?? 0, fsSparkMax)}px`,
                              background: row.color,
                            }"
                          />
                        </div>
                      </td>
                    </tr>
                    <!-- Total writes summary row -->
                    <tr v-if="fsWritesRow" class="vz-spark__total-row">
                      <td class="vz-spark__td-name">
                        <div class="vz-spark__name-inner">
                          <span
                            class="vz-spark__dot"
                            :style="{ background: fsWritesRow.color }"
                          />
                          <strong>{{ fsWritesRow.label }}</strong>
                        </div>
                      </td>
                      <td class="vz-spark__td-total">
                        <strong>{{ fmtNum(fsWritesRow.total7d) }}</strong>
                      </td>
                      <td
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__td-day"
                        :data-tip="`${shortDay(day)}: ${fmtNum(fsWritesRow.counts[day] ?? 0)}`"
                      >
                        <div class="vz-spark__bar-wrap">
                          <div
                            class="vz-spark__bar"
                            :style="{
                              height: `${barPx(fsWritesRow.counts[day] ?? 0, fsWritesMax)}px`,
                              background: fsWritesRow.color,
                            }"
                          />
                        </div>
                      </td>
                    </tr>
                    <!-- Reads row (Cloud Monitoring) -->
                    <tr v-if="fsReadsRow" class="vz-spark__total-row">
                      <td class="vz-spark__td-name">
                        <div class="vz-spark__name-inner">
                          <span
                            class="vz-spark__dot"
                            :style="{ background: fsReadsRow.color }"
                          />
                          <strong>{{ fsReadsRow.label }}</strong>
                        </div>
                      </td>
                      <td class="vz-spark__td-total">
                        <strong>{{ fmtNum(fsReadsRow.total7d) }}</strong>
                      </td>
                      <td
                        v-for="day in SPARK_DAYS"
                        :key="day"
                        class="vz-spark__td-day"
                        :data-tip="`${shortDay(day)}: ${fmtNum(fsReadsRow.counts[day] ?? 0)}`"
                      >
                        <div class="vz-spark__bar-wrap">
                          <div
                            class="vz-spark__bar"
                            :style="{
                              height: `${barPx(fsReadsRow.counts[day] ?? 0, fsReadsMax)}px`,
                              background: fsReadsRow.color,
                            }"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p class="vz-dash__rw-limit">
                  Free tier: {{ fmtNum(firestore.freeTier.readsPerDay) }} reads
                  / {{ fmtNum(firestore.freeTier.writesPerDay) }} writes per day
                  <template v-if="firestore.monitoringError"
                    >&nbsp;·&nbsp; Reads &amp; storage unavailable:
                    {{ firestore.monitoringError }}</template
                  >
                </p>
              </div>

              <div class="vz-dash__section">
                <a
                  :href="firestore.consoleUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="vz-dash__ext-link"
                >
                  Open Firebase Console
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </template>
          </div>

          <!-- ── Blog ──────────────────────────────────── -->
          <div v-else-if="active === 'blog'" class="vz-dash__panel">
            <div class="vz-dash__panel-header">
              <div class="vz-dash__panel-title-row">
                <svg
                  class="vz-dash__panel-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: #f472b6"
                >
                  <path
                    d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"
                  />
                </svg>
                <span class="vz-dash__panel-title">Blog</span>
                <span class="vz-dash__panel-badge"
                  >Article views · last 7 days</span
                >
              </div>
            </div>

            <div v-if="loading" class="vz-dash__loading">Loading…</div>
            <div v-else-if="blogErr" class="vz-dash__error">{{ blogErr }}</div>
            <template v-else-if="blog">
              <div v-if="!blog.series.length" class="vz-dash__loading">
                No article views in the last 7 days.
              </div>
              <template v-else>
                <!-- Stacked bar chart -->
                <div class="vz-dash__section">
                  <div class="vz-dash__section-header">
                    <p class="vz-dash__section-title">Daily views</p>
                    <span class="vz-dash__section-badge"
                      >{{ fmtNum(blog.totalViews) }} total</span
                    >
                  </div>
                  <div class="vz-blog__chart">
                    <div
                      v-for="bar in blogChart"
                      :key="bar.day"
                      class="vz-blog__col"
                    >
                      <div class="vz-blog__total">
                        {{ bar.total > 0 ? bar.total : "" }}
                      </div>
                      <div class="vz-blog__stack">
                        <div
                          v-for="seg in bar.segments"
                          :key="seg.slug"
                          class="vz-blog__seg"
                          :style="{
                            height: `${seg.h}px`,
                            background: seg.color,
                          }"
                          :data-tip="`${seg.id} — ${seg.title}: ${seg.count}`"
                        />
                      </div>
                      <div class="vz-blog__day">{{ shortDay(bar.day) }}</div>
                    </div>
                  </div>
                  <!-- Legend: ID + full title -->
                  <div class="vz-blog__legend">
                    <span
                      v-for="s in blog.series"
                      :key="s.slug"
                      class="vz-blog__legend-item"
                    >
                      <span
                        class="vz-blog__legend-dot"
                        :style="{ background: s.color }"
                      />
                      <span class="vz-blog__legend-id">{{ s.id }}</span>
                      <span class="vz-blog__legend-title">{{ s.title }}</span>
                    </span>
                  </div>
                </div>

                <!-- Per-article sparkline table -->
                <div class="vz-dash__section">
                  <p class="vz-dash__section-title">Per-article breakdown</p>
                  <table class="vz-spark">
                    <thead>
                      <tr>
                        <th class="vz-spark__th-name">Article</th>
                        <th class="vz-spark__th-total">7d total</th>
                        <th
                          v-for="day in SPARK_DAYS"
                          :key="day"
                          class="vz-spark__th-day"
                        >
                          {{ shortDay(day) }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in blogSparkRows" :key="row.key">
                        <!-- ID + truncated title; full title on native hover -->
                        <td class="vz-spark__td-name" :title="row.label">
                          <div class="vz-spark__name-inner">
                            <span
                              class="vz-spark__dot"
                              :style="{ background: row.color }"
                            />
                            <span class="vz-blog__art-id">{{ row.id }}</span>
                            <span class="vz-blog__art-label">{{
                              truncate(row.label, 24)
                            }}</span>
                          </div>
                        </td>
                        <td class="vz-spark__td-total">{{ row.total7d }}</td>
                        <td
                          v-for="day in SPARK_DAYS"
                          :key="day"
                          class="vz-spark__td-day"
                          :data-tip="`${shortDay(day)}: ${row.counts[day] ?? 0}`"
                        >
                          <div class="vz-spark__bar-wrap">
                            <div
                              class="vz-spark__bar"
                              :style="{
                                height: `${barPx(row.counts[day] ?? 0, blogSparkMax)}px`,
                                background: row.color,
                              }"
                            />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </template>
          </div>

          <!-- ── Fly.io ──────────────────────────────────── -->
          <div v-else class="vz-dash__panel">
            <div class="vz-dash__panel-header">
              <div class="vz-dash__panel-title-row">
                <svg
                  class="vz-dash__panel-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style="color: #8b5cf6"
                >
                  <path
                    d="M21 16.5c0 2.485-4.03 4.5-9 4.5s-9-2.015-9-4.5V12c0 2.485 4.03 4.5 9 4.5s9-2.015 9-4.5v4.5z"
                  />
                  <path
                    d="M21 12c0 2.485-4.03 4.5-9 4.5S3 14.485 3 12V7.5C3 5.015 7.03 3 12 3s9 2.015 9 4.5V12z"
                  />
                </svg>
                <span class="vz-dash__panel-title">Fly.io</span>
                <span class="vz-dash__panel-badge"
                  >{{ fly?.app ?? "sgummalla-net" }} · metrics last 5 min / 24
                  h</span
                >
              </div>
            </div>

            <div v-if="loading" class="vz-dash__loading">Loading…</div>
            <div v-else-if="flyErr" class="vz-dash__error">{{ flyErr }}</div>
            <template v-else-if="fly">
              <div class="vz-dash__section">
                <p class="vz-dash__section-title">Machine metrics</p>
                <table class="vz-dash__table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th class="vz-dash__tc">Value</th>
                      <th class="vz-dash__tc vz-dash__tdim">Window</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="vz-dash__tname">CPU (user)</td>
                      <td class="vz-dash__tc">
                        {{
                          fly.cpu.userPercent !== null
                            ? `${fly.cpu.userPercent}%`
                            : "—"
                        }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">5 min avg</td>
                    </tr>
                    <tr>
                      <td class="vz-dash__tname">Memory used</td>
                      <td class="vz-dash__tc">
                        {{
                          fly.memory.usedBytes !== null
                            ? fmt(fly.memory.usedBytes)
                            : "—"
                        }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">
                        of
                        {{
                          fly.memory.totalBytes !== null
                            ? fmt(fly.memory.totalBytes)
                            : "—"
                        }}
                      </td>
                    </tr>
                    <tr>
                      <td class="vz-dash__tname">Network sent</td>
                      <td class="vz-dash__tc">
                        {{
                          fly.network.sentBytes24h !== null
                            ? fmt(fly.network.sentBytes24h)
                            : "—"
                        }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">24 h</td>
                    </tr>
                    <tr>
                      <td class="vz-dash__tname">Network received</td>
                      <td class="vz-dash__tc">
                        {{
                          fly.network.recvBytes24h !== null
                            ? fmt(fly.network.recvBytes24h)
                            : "—"
                        }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">24 h</td>
                    </tr>
                    <tr>
                      <td class="vz-dash__tname">HTTP requests</td>
                      <td class="vz-dash__tc">
                        {{ fmtNum(fly.http.requests24h) }}
                      </td>
                      <td class="vz-dash__tc vz-dash__tdim">24 h</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="vz-dash__section">
                <p class="vz-dash__billing-note">
                  Dollar costs are not available via the Fly.io API.
                </p>
                <a
                  :href="fly.billingUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="vz-dash__ext-link"
                >
                  View billing on Fly.io
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path
                      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                    />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* ── Layout ── */
.vz-dash {
  width: 100%;
  max-width: 1080px;
  animation: vz-rise 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes vz-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vz-dash__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--vz-border);
}

.vz-dash__title {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--vz-text);
  line-height: 1;
  margin-bottom: 0.35rem;
}

.vz-dash__sub {
  font-size: 0.88rem;
  color: var(--vz-text2);
}

.vz-dash__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.vz-dash__updated {
  font-family: var(--vz-font-mono);
  font-size: 0.7rem;
  color: var(--vz-text3);
}

.vz-dash__refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: var(--vz-text3);
  background: none;
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-md);
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.vz-dash__refresh:hover {
  color: var(--vz-orange);
  border-color: var(--vz-orange);
}

/* ── Two-column layout ── */
.vz-dash__layout {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 1.5rem;
  align-items: start;
}

@media (max-width: 700px) {
  .vz-dash__layout {
    grid-template-columns: 1fr;
  }
}

/* ── Side nav ── */
.vz-dash__sidenav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: 1rem;
}

.vz-dash__navitem {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.75rem;
  font-family: var(--vz-font-sans);
  font-size: 0.875rem;
  color: var(--vz-text2);
  background: none;
  border: none;
  border-radius: var(--vz-radius-md);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.vz-dash__navitem:hover {
  background: var(--vz-orange-dim);
  color: var(--vz-orange);
}
.vz-dash__navitem--active {
  background: var(--vz-orange-dim);
  color: var(--vz-orange);
  font-weight: 500;
}

.vz-dash__navdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Panel ── */
.vz-dash__panel {
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-lg);
  overflow: hidden;
}

.vz-dash__panel-header {
  padding: 1rem 1.4rem;
  border-bottom: 1px solid var(--vz-border);
  background: var(--vz-surface);
}

.vz-dash__panel-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.vz-dash__panel-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.vz-dash__panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vz-text);
}

.vz-dash__panel-badge {
  font-family: var(--vz-font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: var(--vz-radius-sm);
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border);
  color: var(--vz-text3);
}

.vz-dash__loading {
  padding: 1.5rem 1.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  color: var(--vz-text3);
}
.vz-dash__error {
  padding: 1.5rem 1.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  color: var(--vz-red);
}

/* ── Section ── */
.vz-dash__section {
  padding: 1rem 1.4rem;
  border-bottom: 1px solid var(--vz-border);
}
.vz-dash__section:last-child {
  border-bottom: none;
}

.vz-dash__section-title {
  font-family: var(--vz-font-mono);
  font-size: 0.67rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  margin-bottom: 0.75rem;
}

/* ── Storage bar ── */
.vz-dash__bar-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.45rem;
}
.vz-dash__bar-label {
  font-size: 0.82rem;
  color: var(--vz-text2);
}
.vz-dash__bar-value {
  font-family: var(--vz-font-mono);
  font-size: 0.78rem;
  color: var(--vz-text);
}
.vz-dash__bar-track {
  height: 6px;
  background: var(--vz-surface2);
  border-radius: 99px;
  overflow: hidden;
}
.vz-dash__bar-fill {
  height: 100%;
  background: #00e5a0;
  border-radius: 99px;
  transition: width 0.4s;
}
.vz-dash__bar-fill--warn {
  background: var(--vz-amber);
}
.vz-dash__bar-pct {
  font-family: var(--vz-font-mono);
  font-size: 0.67rem;
  color: var(--vz-text3);
  margin-top: 0.25rem;
}

/* ── Info table ── */
.vz-dash__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.vz-dash__table th,
.vz-dash__table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: middle;
}

.vz-dash__table th:first-child,
.vz-dash__table td:first-child {
  padding-left: 0;
}

.vz-dash__table th:last-child,
.vz-dash__table td:last-child {
  padding-right: 0;
}

.vz-dash__table thead tr {
  border-bottom: 1px solid var(--vz-border2);
}

.vz-dash__table th {
  font-family: var(--vz-font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
  font-weight: 600;
  white-space: nowrap;
}

.vz-dash__table td {
  border-bottom: 1px solid var(--vz-border);
  color: var(--vz-text);
}
.vz-dash__table tbody tr:last-child td {
  border-bottom: none;
}
.vz-dash__table tbody tr:hover td {
  background: var(--vz-surface);
}

.vz-dash__tname {
  font-family: var(--vz-font-mono);
  font-size: 0.76rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.vz-dash__tname-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vz-dash__tc {
  text-align: right;
  font-family: var(--vz-font-mono);
  font-size: 0.76rem;
  white-space: nowrap;
}
.vz-dash__tdim {
  color: var(--vz-text3);
}

/* ── Sparkline table ── */
.vz-spark {
  width: 100%;
  border-collapse: collapse;
}

.vz-spark th,
.vz-spark td {
  vertical-align: middle;
  padding: 0.45rem 0.4rem;
}

.vz-spark th:first-child,
.vz-spark td:first-child {
  padding-left: 0;
}

.vz-spark thead tr {
  border-bottom: 1px solid var(--vz-border2);
}

.vz-spark th {
  font-family: var(--vz-font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
  font-weight: 600;
  white-space: nowrap;
}

.vz-spark__th-name {
  text-align: left;
}
.vz-spark__th-total {
  text-align: right;
  padding-right: 1rem;
}
.vz-spark__th-day {
  text-align: center;
  width: 36px;
}

.vz-spark td {
  border-bottom: 1px solid var(--vz-border);
}
.vz-spark tbody tr:last-child td {
  border-bottom: none;
}
.vz-spark tbody tr:hover td {
  background: var(--vz-surface);
}

.vz-spark__td-name {
  font-family: var(--vz-font-mono);
  font-size: 0.76rem;
  color: var(--vz-text);
  white-space: nowrap;
}

.vz-spark__name-inner {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.vz-spark__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vz-spark__td-total {
  text-align: right;
  padding-right: 1rem;
  font-family: var(--vz-font-mono);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vz-text);
  white-space: nowrap;
}

/* Day cell: fixed width, tooltip on hover */
.vz-spark__td-day {
  text-align: center;
  width: 36px;
  position: relative;
  cursor: default;
}

.vz-spark__td-day::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--vz-text);
  color: var(--vz-bg);
  font-family: var(--vz-font-mono);
  font-size: 0.6rem;
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s;
  z-index: 20;
}

.vz-spark__td-day:hover::after {
  opacity: 1;
}

/* Bar inside the day cell */
.vz-spark__bar-wrap {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 24px;
}

.vz-spark__bar {
  width: 14px;
  border-radius: 2px 2px 0 0;
  opacity: 0.75;
  transition:
    opacity 0.12s,
    height 0.2s;
}

.vz-spark__td-day:hover .vz-spark__bar {
  opacity: 1;
}

/* ── Section header with badge ── */
.vz-dash__section-header {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.vz-dash__section-header .vz-dash__section-title {
  margin-bottom: 0;
}
.vz-dash__section-badge {
  font-family: var(--vz-font-mono);
  font-size: 0.67rem;
  color: var(--vz-text3);
}

/* ── Blog stacked bar chart ── */
.vz-blog__chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.vz-blog__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 4px;
}

.vz-blog__total {
  font-family: var(--vz-font-mono);
  font-size: 0.6rem;
  color: var(--vz-text3);
  min-height: 14px;
  line-height: 14px;
}

.vz-blog__stack {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
  max-width: 48px;
  gap: 1px;
}

/* ── Blog legend ── */
.vz-blog__legend {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.75rem;
}

.vz-blog__legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.76rem;
}

.vz-blog__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vz-blog__legend-id {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vz-text);
  flex-shrink: 0;
  min-width: 2rem;
}

.vz-blog__legend-title {
  font-family: var(--vz-font-sans);
  color: var(--vz-text2);
}

/* ── Blog sparkline name column ── */
.vz-blog__art-id {
  font-family: var(--vz-font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--vz-text);
  flex-shrink: 0;
  min-width: 2rem;
}

.vz-blog__art-label {
  font-family: var(--vz-font-mono);
  font-size: 0.68rem;
  color: var(--vz-text3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vz-blog__seg {
  width: 100%;
  border-radius: 2px;
  opacity: 0.82;
  position: relative;
  transition: opacity 0.12s;
  cursor: default;
}

.vz-blog__seg:first-child {
  border-radius: 2px 2px 0 0;
}
.vz-blog__seg:last-child {
  border-radius: 0 0 2px 2px;
}
.vz-blog__seg:only-child {
  border-radius: 2px;
}

.vz-blog__seg:hover {
  opacity: 1;
}

.vz-blog__seg::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--vz-text);
  color: var(--vz-bg);
  font-family: var(--vz-font-mono);
  font-size: 0.6rem;
  padding: 0.2rem 0.45rem;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s;
  z-index: 20;
}

.vz-blog__seg:hover::after {
  opacity: 1;
}

.vz-blog__day {
  font-family: var(--vz-font-mono);
  font-size: 0.62rem;
  color: var(--vz-text3);
}

/* ── Misc ── */
.vz-spark__total-row td {
  border-top: 1px solid var(--vz-border2);
  background: var(--vz-surface);
}

.vz-dash__rw-limit {
  font-family: var(--vz-font-mono);
  font-size: 0.67rem;
  color: var(--vz-text3);
  margin-top: 0.75rem;
}

.vz-dash__billing-note {
  font-size: 0.78rem;
  color: var(--vz-text3);
  margin-bottom: 0.6rem;
}

.vz-dash__ext-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--vz-font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--vz-text2);
  text-decoration: none;
  transition: color 0.15s;
}
.vz-dash__ext-link:hover {
  color: var(--vz-text);
}
</style>
