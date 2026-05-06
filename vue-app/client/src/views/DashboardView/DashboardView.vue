<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { AppLayout } from "@sgw/ui";
import { useAuthStore } from "../../stores/auth";
import {
  useDashboard,
  barPx,
  type DashboardSection,
} from "../../composables/useDashboard";

type Section = DashboardSection;
import { fmt, fmtNum, truncate } from "../../utils/format";

const router = useRouter();
const auth = useAuthStore();

const {
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
} = useDashboard();

async function handleLogout() {
  await auth.logout();
  await router.push({ name: "login" });
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

<style scoped src="./DashboardView.css"></style>
