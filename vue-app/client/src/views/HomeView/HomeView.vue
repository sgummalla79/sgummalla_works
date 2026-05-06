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

<style scoped src="./HomeView.css"></style>
