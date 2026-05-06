<script setup lang="ts">
const SYMBOLS = {
  pi: `<line x1="10" y1="18" x2="90" y2="18" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
       <path d="M30 18 Q28 55 22 82" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/>
       <path d="M70 18 Q72 55 78 82" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/>`,

  phi: `<circle cx="50" cy="50" r="28" stroke="currentColor" stroke-width="7" fill="none"/>
        <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`,

  infinity: `<path d="M50 50 C50 32 38 22 26 22 C14 22 8 32 8 50 C8 68 14 78 26 78 C38 78 50 68 50 50 C50 32 62 22 74 22 C86 22 92 32 92 50 C92 68 86 78 74 78 C62 78 50 68 50 50 Z"
              stroke="currentColor" stroke-width="7" fill="none" stroke-linejoin="round"/>`,

  atom: `<ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="currentColor" stroke-width="5"/>
         <ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="currentColor" stroke-width="5" transform="rotate(60 50 50)"/>
         <ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="currentColor" stroke-width="5" transform="rotate(120 50 50)"/>
         <circle cx="50" cy="50" r="7" fill="currentColor"/>
         <circle cx="50" cy="36" r="4" fill="currentColor"/>
         <circle cx="62" cy="57" r="4" fill="currentColor"/>
         <circle cx="38" cy="57" r="4" fill="currentColor"/>`,
};

// Asymmetric layout — creates diagonal tension across the page
const symbols = [
  // π — top-left, fully visible
  { svg: SYMBOLS.pi, size: 200, rotation: -10, style: "top:60px; left:20px" },
  // ∞ — mid-right, floats in the right third
  {
    svg: SYMBOLS.infinity,
    size: 320,
    rotation: -15,
    style: "top:38%; right:-90px",
  },
  // atom — lower-right, bleeds off bottom
  {
    svg: SYMBOLS.atom,
    size: 260,
    rotation: 22,
    style: "bottom:-60px; right:8%",
  },
  // φ — left side, lower-mid, smaller — creates asymmetry
  {
    svg: SYMBOLS.phi,
    size: 200,
    rotation: -8,
    style: "bottom:18%; left:-50px",
  },
];
</script>

<template>
  <div class="vz-symbol-layer" aria-hidden="true">
    <div
      v-for="(s, i) in symbols"
      :key="i"
      class="vz-symbol"
      :style="`${s.style}; width:${s.size}px; height:${s.size}px; transform:rotate(${s.rotation}deg)`"
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <g v-html="s.svg" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.vz-symbol-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.vz-symbol {
  position: absolute;
  pointer-events: none;
  user-select: none;
  color: var(--vz-symbol-color, rgba(255, 255, 255, 0.22));
}
</style>
