<script setup lang="ts">
import { AppLayout } from "@sgw/ui";
</script>

<template>
  <!-- non-scrollable: fills 100vh, no vertical bar -->
  <AppLayout>
    <div class="sgw-page">
      <!-- ── Left: hero ────────────────────────────────────────────── -->
      <div class="sgw-hero">
        <div class="sgw-hero__grid" aria-hidden="true" />

        <div class="sgw-hero__content">
          <span class="sgw-eyebrow">
            <span class="sgw-eyebrow__dot" />
            Technical Architecture
          </span>

          <h1 class="sgw-headline">
            Making<br />
            Complexity<br />
            <span class="sgw-headline--accent">Feel Obvious.</span>
          </h1>

          <p class="sgw-hero__body">
            A Technical Architect's private workspace for building live proof of
            concepts and demos — because the best argument is a working system,
            not a slide.
          </p>

          <blockquote class="sgw-hero__quote">
            <p class="sgw-hero__quote-text">
              "The most powerful thing you can put in front of a customer is a
              live, working system that solves their problem — exactly as they
              described it."
            </p>
            <footer class="sgw-hero__quote-attr">
              <span class="sgw-hero__quote-dash">—</span>
              Suman Gummalla, Technical Architect
            </footer>
          </blockquote>
        </div>

        <!-- Abstract diagram — decorative only -->
        <div class="sgw-hero__diagram" aria-hidden="true">
          <svg
            viewBox="0 0 300 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="sgw-abstract"
          >
            <circle
              cx="150"
              cy="150"
              r="135"
              stroke="currentColor"
              stroke-opacity="0.05"
            />
            <circle
              cx="150"
              cy="150"
              r="98"
              stroke="currentColor"
              stroke-opacity="0.07"
              stroke-dasharray="3 8"
            />
            <circle
              cx="150"
              cy="150"
              r="62"
              stroke="currentColor"
              stroke-opacity="0.09"
              stroke-dasharray="1 6"
            />
            <line
              x1="150"
              y1="15"
              x2="150"
              y2="42"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <line
              x1="150"
              y1="258"
              x2="150"
              y2="285"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <line
              x1="15"
              y1="150"
              x2="42"
              y2="150"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <line
              x1="258"
              y1="150"
              x2="285"
              y2="150"
              stroke="currentColor"
              stroke-opacity="0.12"
            />
            <line
              x1="44"
              y1="44"
              x2="63"
              y2="63"
              stroke="currentColor"
              stroke-opacity="0.08"
            />
            <line
              x1="237"
              y1="237"
              x2="256"
              y2="256"
              stroke="currentColor"
              stroke-opacity="0.08"
            />
            <line
              x1="256"
              y1="44"
              x2="237"
              y2="63"
              stroke="currentColor"
              stroke-opacity="0.08"
            />
            <line
              x1="44"
              y1="256"
              x2="63"
              y2="237"
              stroke="currentColor"
              stroke-opacity="0.08"
            />
            <circle cx="150" cy="42" r="8" class="sgw-node" />
            <circle cx="258" cy="150" r="8" class="sgw-node" />
            <circle cx="150" cy="258" r="8" class="sgw-node" />
            <circle cx="42" cy="150" r="8" class="sgw-node" />
            <circle cx="228" cy="72" r="5" class="sgw-node sgw-node--sm" />
            <circle cx="228" cy="228" r="5" class="sgw-node sgw-node--sm" />
            <circle cx="72" cy="72" r="5" class="sgw-node sgw-node--sm" />
            <circle cx="72" cy="228" r="5" class="sgw-node sgw-node--sm" />
            <circle cx="150" cy="150" r="36" class="sgw-hub-outer" />
            <circle cx="150" cy="150" r="26" class="sgw-hub" />
            <circle cx="150" cy="150" r="36" class="sgw-hub-pulse" />
            <line
              x1="150"
              y1="139"
              x2="150"
              y2="161"
              stroke="currentColor"
              stroke-opacity="0.2"
              stroke-width="1.5"
            />
            <line
              x1="139"
              y1="150"
              x2="161"
              y2="150"
              stroke="currentColor"
              stroke-opacity="0.2"
              stroke-width="1.5"
            />
            <circle
              cx="150"
              cy="150"
              r="3.5"
              fill="currentColor"
              opacity="0.28"
            />
          </svg>
        </div>
      </div>

      <!-- ── Right: bento ──────────────────────────────────────────── -->
      <div class="sgw-bento">
        <div class="sgw-tile sgw-tile--a">
          <span class="sgw-tile__num">01</span>
          <h3 class="sgw-tile__title">Think</h3>
          <p class="sgw-tile__body">
            Define the real problem. Map the architecture before touching
            anything.
          </p>
        </div>

        <div class="sgw-tile sgw-tile--b">
          <span class="sgw-tile__num">02</span>
          <h3 class="sgw-tile__title">Build</h3>
          <p class="sgw-tile__body">
            Wire up real systems — not prototypes. If it can't survive an
            unexpected question, it isn't ready.
          </p>
        </div>

        <div class="sgw-tile sgw-tile--c">
          <span class="sgw-tile__num">03</span>
          <h3 class="sgw-tile__title">Demo</h3>
          <p class="sgw-tile__body">
            A live system in front of the customer. Let them click. Let them
            explore.
          </p>
        </div>

        <div class="sgw-tile sgw-tile--d">
          <div class="sgw-tile__icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <h3 class="sgw-tile__title">Precision First</h3>
          <p class="sgw-tile__body">
            Speed comes from clarity. Every good demo starts with a defined
            problem, not a feature list.
          </p>
        </div>

        <div class="sgw-tile sgw-tile--e">
          <div class="sgw-tile__icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
            </svg>
          </div>
          <h3 class="sgw-tile__title">Live, Not Mocked</h3>
          <p class="sgw-tile__body">
            Real systems. Real responses. Nothing scripted, nothing that
            collapses under scrutiny.
          </p>
        </div>

        <div class="sgw-tile sgw-tile--f">
          <div class="sgw-tile__icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 class="sgw-tile__title">Built for the Room</h3>
          <p class="sgw-tile__body">
            The goal is not to impress — it is to give customers the confidence
            to decide.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="sgw-footer-live">
        <span class="sgw-footer-dot" />
        Live
      </div>
      <span class="sgw-footer-tagline"
        >Ideas in Motion, Think. Build. Demo.</span
      >
    </template>
  </AppLayout>
</template>

<style scoped>
/* ── Page: two-column, fills available space ──────────────────────── */
.sgw-page {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: center;
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.sgw-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(1rem, 2vh, 1.75rem);
}

.sgw-hero__grid {
  position: absolute;
  inset: -4rem -2rem;
  background-image:
    linear-gradient(var(--vz-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--vz-border) 1px, transparent 1px);
  background-size: 52px 52px;
  -webkit-mask-image: radial-gradient(
    ellipse 90% 90% at 40% 50%,
    black 0%,
    transparent 70%
  );
  mask-image: radial-gradient(
    ellipse 90% 90% at 40% 50%,
    black 0%,
    transparent 70%
  );
  pointer-events: none;
}

.sgw-hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.5vh, 1.25rem);
}

.sgw-hero__diagram {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  opacity: 0.35;
  z-index: 0;
}

/* ── Eyebrow ──────────────────────────────────────────────────────── */
.sgw-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--vz-font-mono);
  font-size: clamp(0.62rem, 0.7vw, 0.72rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vz-orange);
}

.sgw-eyebrow__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vz-orange);
  flex-shrink: 0;
  animation: sgw-pulse 2.5s ease-in-out infinite;
}

@keyframes sgw-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

/* ── Headline ─────────────────────────────────────────────────────── */
.sgw-headline {
  font-family: var(--vz-font-display);
  font-size: clamp(2.75rem, 5.5vw, 5.5rem);
  line-height: 0.92;
  letter-spacing: 0.01em;
  color: var(--vz-text);
  margin: 0;
}

.sgw-headline--accent {
  color: var(--vz-orange);
}

.sgw-hero__body {
  font-family: var(--vz-font-sans);
  font-size: clamp(0.825rem, 1vw, 1rem);
  line-height: 1.65;
  color: var(--vz-text2);
  max-width: 38ch;
  margin: 0;
}

/* ── Quote ────────────────────────────────────────────────────────── */
.sgw-hero__quote {
  border-left: 2px solid var(--vz-orange);
  padding: clamp(0.6rem, 1vh, 0.85rem) clamp(0.75rem, 1.2vw, 1rem);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sgw-hero__quote-text {
  font-family: var(--vz-font-sans);
  font-size: clamp(0.72rem, 0.85vw, 0.85rem);
  font-style: italic;
  line-height: 1.6;
  color: var(--vz-text2);
  margin: 0;
}

.sgw-hero__quote-attr {
  font-family: var(--vz-font-mono);
  font-size: clamp(0.6rem, 0.7vw, 0.68rem);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vz-text3);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sgw-hero__quote-dash {
  color: var(--vz-orange);
}

/* ── Abstract SVG ─────────────────────────────────────────────────── */
.sgw-abstract {
  width: clamp(120px, 20vw, 220px);
  color: var(--vz-text);
}

.sgw-node {
  fill: var(--vz-surface2);
  stroke: var(--vz-border2);
  stroke-width: 1;
}
.sgw-node--sm {
  fill: var(--vz-surface);
  stroke: var(--vz-border);
}
.sgw-hub-outer {
  fill: var(--vz-surface2);
  stroke: var(--vz-border2);
  stroke-width: 1;
}
.sgw-hub {
  fill: var(--vz-surface);
}
.sgw-hub-pulse {
  fill: none;
  stroke: var(--vz-orange);
  stroke-width: 1;
  stroke-opacity: 0;
  animation: sgw-ring-pulse 4s ease-out infinite;
}

@keyframes sgw-ring-pulse {
  0% {
    stroke-opacity: 0.45;
    r: 36;
  }
  100% {
    stroke-opacity: 0;
    r: 62;
  }
}

/* ── Bento grid ───────────────────────────────────────────────────── */
.sgw-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: 1fr 1fr;
  gap: clamp(0.5rem, 0.9vw, 0.9rem);
  align-self: stretch; /* fill column height to match hero */
}

/* Varied column spans for organic sizing */
.sgw-tile--a {
  grid-column: span 1;
}
.sgw-tile--b {
  grid-column: span 2;
} /* wide */
.sgw-tile--c {
  grid-column: span 1;
}
.sgw-tile--d {
  grid-column: span 1;
}
.sgw-tile--e {
  grid-column: span 1;
}
.sgw-tile--f {
  grid-column: span 1;
}

/* ── Tile ─────────────────────────────────────────────────────────── */
.sgw-tile {
  background: var(--vz-surface);
  border: 1px solid var(--vz-border);
  border-radius: var(--vz-radius-lg);
  padding: clamp(0.9rem, 1.4vw, 1.4rem);
  display: flex;
  flex-direction: column;
  gap: clamp(0.35rem, 0.6vh, 0.6rem);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition:
    border-color 0.18s,
    transform 0.18s;
}

.sgw-tile:hover {
  border-color: var(--vz-border2);
  transform: translateY(-1px);
}

.sgw-tile__num {
  font-family: var(--vz-font-display);
  font-size: clamp(1.5rem, 2.2vw, 2.25rem);
  line-height: 1;
  color: var(--vz-border2);
  flex-shrink: 0;
}

.sgw-tile__icon {
  width: 30px;
  height: 30px;
  border-radius: var(--vz-radius-md);
  background: var(--vz-surface2);
  border: 1px solid var(--vz-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vz-text2);
  flex-shrink: 0;
}

.sgw-tile__title {
  font-family: var(--vz-font-display);
  font-size: clamp(1rem, 1.4vw, 1.4rem);
  letter-spacing: 0.02em;
  color: var(--vz-text);
  margin: 0;
  flex-shrink: 0;
}

.sgw-tile__body {
  font-family: var(--vz-font-sans);
  font-size: clamp(0.72rem, 0.85vw, 0.825rem);
  line-height: 1.55;
  color: var(--vz-text2);
  margin: 0;
}

/* ── Footer ───────────────────────────────────────────────────────── */
.sgw-footer-live {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--vz-font-mono);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

.sgw-footer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vz-red);
  flex-shrink: 0;
  animation: sgw-dot-pulse 2.5s ease-in-out infinite;
}

@keyframes sgw-dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

.sgw-footer-tagline {
  font-family: var(--vz-font-mono);
  font-size: 0.69rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vz-text3);
}

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .sgw-page {
    grid-template-columns: 1fr;
    max-width: 560px;
    margin: 0 auto;
  }
  .sgw-bento {
    display: none;
  } /* hero alone fits the viewport on small screens */
}
</style>
