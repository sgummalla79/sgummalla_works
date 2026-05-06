<template>
  <div class="seq">
    <!-- Actors -->
    <div class="seq-actors">
      <div class="seq-actor actor-browser">Browser</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-server">Server</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-sf">Salesforce</div>
    </div>

    <!-- Body: lifelines + steps -->
    <div class="seq-body">
      <!--
        Grid: 0.5fr 0.5fr | 60px | 0.5fr 0.5fr | 60px | 0.5fr 0.5fr  (8 cols)
        Lifeline centers are at grid-lines 2, 5, 8 (left edge of each right-half column).
        Arrow grid-column:2/5 spans center-of-Browser → center-of-Server exactly.
      -->
      <div class="lifelines">
        <div class="ll actor-browser" style="grid-column: 2" />
        <div class="ll actor-server" style="grid-column: 5" />
        <div class="ll actor-sf" style="grid-column: 8" />
      </div>

      <div class="seq-steps">
        <!-- 1: Browser → Server -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 2/5; grid-row: 1">
            1. POST /token { sf_username }
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--browser-c); grid-column: 2/5; grid-row: 2"
          />
        </div>

        <!-- 2: Server self — Mint JWT -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--server-c);
              --nb: var(--server-note);
              grid-column: 5/9;
              grid-row: 1;
            "
          >
            <span class="note-title">2. Mint RS256 JWT assertion</span>
            <span class="note-sub">iss=ConsumerKey · sub=sfUsername</span>
          </div>
        </div>

        <!-- 3: Server → Salesforce -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 5/8; grid-row: 1">
            3. POST /oauth2/token<br />(jwt-bearer grant)
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--server-c); grid-column: 5/8; grid-row: 2"
          />
        </div>

        <!-- 4: Salesforce self — Validate -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--sf-c);
              --nb: var(--sf-note);
              grid-column: 6/9;
              grid-row: 1;
            "
          >
            <span class="note-title">4. Validate JWT with certificate</span>
          </div>
        </div>

        <!-- 5: Salesforce → Server (return) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 5/8; grid-row: 1">
            5. { access_token, instance_url }
          </div>
          <div
            class="seq-arrow-l"
            style="--ac: var(--sf-c); grid-column: 5/8; grid-row: 2"
          />
        </div>

        <!-- 6: Server self — Save -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--server-c);
              --nb: var(--server-note);
              grid-column: 5/9;
              grid-row: 1;
            "
          >
            <span class="note-title">6. Save token to database</span>
          </div>
        </div>

        <!-- 7: Server → Browser (return) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 2/5; grid-row: 1">
            7. { access_token, instance_url,<br />sf_username }
          </div>
          <div
            class="seq-arrow-l"
            style="--ac: var(--server-c); grid-column: 2/5; grid-row: 2"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="seq-legend">
      <span class="leg-dot" style="background: var(--browser-c)" />Browser
      <span class="leg-dot" style="background: var(--server-c)" />Server
      <span class="leg-dot" style="background: var(--sf-c)" />Salesforce
      <div class="leg-note">
        RSA private key never leaves the server · all Salesforce calls are
        server-to-server
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Default = dark (matches app default theme).
  Light override via :root[style*="color-scheme: light"] — the app sets this on <html>
  when the user toggles to light mode via the theme plugin.
*/

/* ── Dark (default) ── */
.seq {
  --browser-c: #3b82f6;
  --browser-bg: #172554;
  --browser-tx: #bfdbfe;
  --server-c: #7c3aed;
  --server-bg: #2e1065;
  --server-tx: #ddd6fe;
  --sf-c: #0ea5e9;
  --sf-bg: #083344;
  --sf-tx: #bae6fd;
  --server-note: #1e1135;
  --sf-note: #0c2233;
  --seq-bg: #0f1823;
  --label-c: #e2e8f0;
  --note-title: #cbd5e1;
  --note-sub: #94a3b8;
  --legend-bg: #0b1526;
  --legend-bd: rgba(255, 255, 255, 0.08);
  --legend-c: #94a3b8;
  --legend-nc: #475569;
  --ll-op: 0.22;
}

/* ── Light override ── */
:root[style*="color-scheme: light"] .seq {
  --sf-c: #0284c7;
  --sf-bg: #e0f2fe;
  --sf-tx: #075985;
  --browser-bg: #dbeafe;
  --browser-tx: #1d4ed8;
  --server-bg: #ede9fe;
  --server-tx: #5b21b6;
  --server-note: #f5f3ff;
  --sf-note: #f0f9ff;
  --seq-bg: #f9fafb;
  --label-c: #1e293b;
  --note-title: #374151;
  --note-sub: #6b7280;
  --legend-bg: #f3f4f6;
  --legend-bd: #e5e7eb;
  --legend-c: #6b7280;
  --legend-nc: #9ca3af;
  --ll-op: 0.3;
}

/* ── Container ── */
.seq {
  width: 760px;
  background: var(--seq-bg);
  border-radius: 10px;
  padding: 1.25rem;
  font-family: ui-monospace, "SF Mono", "Fira Code", monospace;
  display: flex;
  flex-direction: column;
}

/* ── Actors ── */
.seq-actors {
  display: flex;
  align-items: stretch;
}
.seq-actor {
  flex: 1;
  text-align: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1.5px solid var(--c);
  background: var(--bg);
  color: var(--tx);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.actor-browser {
  --c: var(--browser-c);
  --bg: var(--browser-bg);
  --tx: var(--browser-tx);
}
.actor-server {
  --c: var(--server-c);
  --bg: var(--server-bg);
  --tx: var(--server-tx);
}
.actor-sf {
  --c: var(--sf-c);
  --bg: var(--sf-bg);
  --tx: var(--sf-tx);
}
.seq-gap {
  width: 72px;
  flex-shrink: 0;
}

/* ── Body + lifelines ── */
.seq-body {
  position: relative;
}

.lifelines {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 0.5fr 0.5fr 72px 0.5fr 0.5fr 72px 0.5fr 0.5fr;
  pointer-events: none;
}
.ll {
  position: relative;
}
.ll::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1.5px dashed var(--c);
  opacity: var(--ll-op);
}

/* ── Steps ── */
.seq-steps {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}
.seq-step {
  display: grid;
  grid-template-columns: 0.5fr 0.5fr 72px 0.5fr 0.5fr 72px 0.5fr 0.5fr;
  grid-template-rows: 1fr auto;
  min-height: 58px;
  padding: 3px 0;
}
.seq-step.n {
  min-height: unset;
}

.seq-label {
  font-size: 13px;
  overflow-wrap: break-word;
  min-width: 0;
  color: var(--label-c);
  padding: 0 6px 3px;
  align-self: end;
  text-align: center;
  z-index: 2;
}

/* ── Arrows ── */
.seq-arrow-r,
.seq-arrow-l {
  height: 2px;
  background: var(--ac);
  position: relative;
  align-self: end;
  margin-bottom: 10px;
  z-index: 2;
}
.seq-arrow-r::after {
  content: "";
  position: absolute;
  right: 0;
  top: -5px;
  border: 6px solid transparent;
  border-left: 10px solid var(--ac);
}
.seq-arrow-l::before {
  content: "";
  position: absolute;
  left: 0;
  top: -5px;
  border: 6px solid transparent;
  border-right: 10px solid var(--ac);
}

/* ── Note boxes ── */
.seq-note {
  border: 1px solid var(--nc);
  background: var(--nb);
  border-radius: 5px;
  padding: 7px 12px;
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  z-index: 2;
  margin: 4px 0 4px 8px;
  align-self: center;
  width: fit-content;
  max-width: 100%;
}
.note-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--note-title);
  white-space: nowrap;
}
.note-sub {
  font-size: 11px;
  color: var(--note-sub);
  white-space: nowrap;
}

/* ── Legend ── */
.seq-legend {
  margin-top: 1rem;
  padding: 0.625rem 1rem;
  background: var(--legend-bg);
  border: 1px solid var(--legend-bd);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--legend-c);
}
.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
  margin-right: 4px;
  flex-shrink: 0;
}
.leg-note {
  width: 100%;
  font-size: 10px;
  color: var(--legend-nc);
}
</style>
