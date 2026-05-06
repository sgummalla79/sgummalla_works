<template>
  <div class="seq">
    <!-- Actors -->
    <div class="seq-actors">
      <div class="seq-actor actor-browser">Browser</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-auth0">Auth0</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-server">Server</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-sf">Salesforce</div>
      <div class="seq-gap" />
      <div class="seq-actor actor-apex">Apex Handler</div>
    </div>

    <!-- Body: lifelines + steps -->
    <div class="seq-body">
      <!--
        Grid: 14 cols = 5 × (0.5fr 0.5fr) + 4 × 66px
        Lifeline centers at grid-lines 2, 5, 8, 11, 14.
        Arrow grid-column:2/8 goes center-of-Browser → center-of-Server (long skip).
      -->
      <div class="lifelines">
        <div class="ll actor-browser" style="grid-column: 2" />
        <div class="ll actor-auth0" style="grid-column: 5" />
        <div class="ll actor-server" style="grid-column: 8" />
        <div class="ll actor-sf" style="grid-column: 11" />
        <div class="ll actor-apex" style="grid-column: 14" />
      </div>

      <div class="seq-steps">
        <!-- Phase 1 -->
        <div class="seq-phase-row">
          <div
            class="seq-phase"
            style="
              --pc: var(--auth0-c);
              --pb: var(--auth0-phase);
              grid-column: 1/7;
            "
          >
            PHASE 1 — USER LOGIN
          </div>
        </div>

        <!-- 1: Browser → Auth0 -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 2/5; grid-row: 1">
            1. OAuth2 Login
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--browser-c); grid-column: 2/5; grid-row: 2"
          />
        </div>

        <!-- 2: Auth0 → Server -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 5/8; grid-row: 1">
            2. id_token<br />(with sf_accounts claim)
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--auth0-c); grid-column: 5/8; grid-row: 2"
          />
        </div>

        <!-- 3: Server self — save id_token -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--server-c);
              --nb: var(--server-note);
              grid-column: 8/12;
              grid-row: 1;
            "
          >
            <span class="note-title">3. Save id_token to database</span>
          </div>
        </div>

        <!-- Phase 2 -->
        <div class="seq-phase-row">
          <div
            class="seq-phase"
            style="--pc: var(--sf-c); --pb: var(--sf-phase); grid-column: 1/15"
          >
            PHASE 2 — TOKEN EXCHANGE
          </div>
        </div>

        <!-- 4: Browser → Server (long, skips Auth0) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 2/8; grid-row: 1">
            4. POST /token (no credentials needed)
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--browser-c); grid-column: 2/8; grid-row: 2"
          />
        </div>

        <!-- 5: Server self — retrieve id_token -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--server-c);
              --nb: var(--server-note);
              grid-column: 8/12;
              grid-row: 1;
            "
          >
            <span class="note-title">5. Retrieve id_token from DB</span>
          </div>
        </div>

        <!-- 6: Server → Salesforce -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 8/11; grid-row: 1">
            6. POST /oauth2/token<br />(token-exchange)
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--server-c); grid-column: 8/11; grid-row: 2"
          />
        </div>

        <!-- 7: Salesforce → Apex -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 11/14; grid-row: 1">
            7. validateIncomingToken(<br />id_token, appDeveloperName)
          </div>
          <div
            class="seq-arrow-r"
            style="--ac: var(--sf-c); grid-column: 11/14; grid-row: 2"
          />
        </div>

        <!-- 8: Apex self — decode JWT -->
        <div class="seq-step n">
          <div
            class="seq-note"
            style="
              --nc: var(--apex-c);
              --nb: var(--apex-note);
              grid-column: 12/15;
              grid-row: 1;
            "
          >
            <span class="note-title">8. Decode Auth0 JWT payload</span>
            <span class="note-sub"
              >sf_accounts → match appDeveloperName → sf_username</span
            >
          </div>
        </div>

        <!-- 9: Apex → Salesforce (return) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 11/14; grid-row: 1">
            9. getUserForTokenSubject(<br />sf_username)
          </div>
          <div
            class="seq-arrow-l"
            style="--ac: var(--apex-c); grid-column: 11/14; grid-row: 2"
          />
        </div>

        <!-- 10: Salesforce → Server (return) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 8/11; grid-row: 1">
            10. { access_token,<br />instance_url }
          </div>
          <div
            class="seq-arrow-l"
            style="--ac: var(--sf-c); grid-column: 8/11; grid-row: 2"
          />
        </div>

        <!-- 11: Server → Browser (long return) -->
        <div class="seq-step">
          <div class="seq-label" style="grid-column: 2/8; grid-row: 1">
            11. { access_token, instance_url, sf_username }
          </div>
          <div
            class="seq-arrow-l"
            style="--ac: var(--server-c); grid-column: 2/8; grid-row: 2"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="seq-legend">
      <span class="leg-dot" style="background: var(--browser-c)" />Browser
      <span class="leg-dot" style="background: var(--auth0-c)" />Auth0 IdP
      <span class="leg-dot" style="background: var(--server-c)" />Server
      <span class="leg-dot" style="background: var(--sf-c)" />Salesforce
      <span class="leg-dot" style="background: var(--apex-c)" />Apex Handler
      <div class="leg-note">
        Auth0 id_token forwarded as-is · Apex handler decodes it, reads
        sf_accounts, matches by appDeveloperName and resolves the Salesforce
        user
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Default = dark (matches app default theme).
  Light override via :root[style*="color-scheme: light"] — the app theme plugin sets
  color-scheme on <html> when the user switches theme.
*/

/* ── Dark (default) ── */
.seq {
  --browser-c: #3b82f6;
  --browser-bg: #172554;
  --browser-tx: #bfdbfe;
  --auth0-c: #d97706;
  --auth0-bg: #451a03;
  --auth0-tx: #fef3c7;
  --server-c: #7c3aed;
  --server-bg: #2e1065;
  --server-tx: #ddd6fe;
  --sf-c: #0ea5e9;
  --sf-bg: #083344;
  --sf-tx: #bae6fd;
  --apex-c: #22c55e;
  --apex-bg: #052e16;
  --apex-tx: #dcfce7;
  --server-note: #1e1135;
  --sf-note: #0c2233;
  --apex-note: #0d2618;
  --auth0-phase: #1c1400;
  --sf-phase: #061f2c;
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
  --browser-bg: #dbeafe;
  --browser-tx: #1d4ed8;
  --auth0-bg: #fef3c7;
  --auth0-tx: #78350f;
  --server-bg: #ede9fe;
  --server-tx: #5b21b6;
  --sf-c: #0284c7;
  --sf-bg: #e0f2fe;
  --sf-tx: #075985;
  --apex-c: #16a34a;
  --apex-bg: #dcfce7;
  --apex-tx: #14532d;
  --server-note: #f5f3ff;
  --sf-note: #f0f9ff;
  --apex-note: #f0fdf4;
  --auth0-phase: #fffbeb;
  --sf-phase: #f0f9ff;
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
  width: 960px;
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
.actor-auth0 {
  --c: var(--auth0-c);
  --bg: var(--auth0-bg);
  --tx: var(--auth0-tx);
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
.actor-apex {
  --c: var(--apex-c);
  --bg: var(--apex-bg);
  --tx: var(--apex-tx);
}
.seq-gap {
  width: 66px;
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
  grid-template-columns: 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr;
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
  padding: 6px 0;
}

.seq-phase-row {
  display: grid;
  grid-template-columns: 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr;
  padding: 2px 0 5px;
}
.seq-phase {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border: 1px solid var(--pc);
  background: var(--pb);
  border-radius: 3px;
  color: var(--pc);
}

.seq-step {
  display: grid;
  grid-template-columns: 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr 66px 0.5fr 0.5fr;
  grid-template-rows: 1fr auto;
  min-height: 44px;
  padding: 2px 0;
}
.seq-step.n {
  min-height: unset;
}

.seq-label {
  font-size: 12px;
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
  margin-bottom: 9px;
  z-index: 2;
}
.seq-arrow-r::after {
  content: "";
  position: absolute;
  right: 0;
  top: -5px;
  border: 6px solid transparent;
  border-left: 9px solid var(--ac);
}
.seq-arrow-l::before {
  content: "";
  position: absolute;
  left: 0;
  top: -5px;
  border: 6px solid transparent;
  border-right: 9px solid var(--ac);
}

/* ── Note boxes ── */
.seq-note {
  border: 1px solid var(--nc);
  background: var(--nb);
  border-radius: 4px;
  padding: 6px 11px;
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  z-index: 2;
  margin: 3px 0 3px 6px;
  align-self: center;
  width: fit-content;
  max-width: 100%;
}
.note-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--note-title);
  white-space: nowrap;
}
.note-sub {
  font-size: 10px;
  color: var(--note-sub);
  white-space: nowrap;
}

/* ── Legend ── */
.seq-legend {
  margin-top: 0.875rem;
  padding: 0.5rem 0.875rem;
  background: var(--legend-bg);
  border: 1px solid var(--legend-bd);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex-wrap: wrap;
  font-size: 11px;
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
