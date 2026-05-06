import type { SgwTheme } from "./tokens";

export const defaultTheme: SgwTheme = {
  name: "Sgummalla Works Dark",
  colors: {
    // MD3: background should not be pure/near-pure black — use a tonal dark
    bg: "#111118",
    bg2: "#1A1A22",
    // MD3 elevation overlay model: surface = bg + primary tint at increasing opacity
    surface: "rgba(255,255,255,0.06)",
    surface2: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.09)",
    border2: "rgba(255,255,255,0.15)",
    text: "#EFEFEF",
    text2: "rgba(255,255,255,0.62)",
    // WCAG fix: raised from 0.30 (2.18:1 fail) → 0.47 (4.81:1 pass)
    text3: "rgba(255,255,255,0.47)",
    navBg: "rgba(17,17,24,0.90)",
    green: "#5AE89A",
    greenDim: "rgba(90,232,154,0.12)",
    red: "#FF6B6B",
    redDim: "rgba(255,107,107,0.12)",
    amber: "#FFC043",
    orange: "#00A1E0",
    orangeDim: "rgba(0,161,224,0.14)",
    symbolColor: "rgba(255,255,255,0.10)",
  },
  font: {
    sans: "'Inter', sans-serif",
    mono: "'Geist Mono', monospace",
    display: "'Bebas Neue', cursive",
  },
  radius: {
    sm: "4px",
    md: "6px",
    lg: "10px",
  },
  tags: {
    jwt: { bg: "rgba(194,65,12,0.18)", text: "#FB923C" },
    saml: { bg: "rgba(124,58,237,0.15)", text: "#A78BFA" },
    oidc: { bg: "rgba(37,99,235,0.15)", text: "#60A5FA" },
    auth0: { bg: "rgba(235,84,36,0.15)", text: "#FB923C" },
  },
};

export const lightTheme: SgwTheme = {
  name: "Sgummalla Works Light",
  colors: {
    bg: "#F6F5F2",
    bg2: "#EEECEA",
    surface: "#FFFFFF",
    surface2: "#F0EEEB",
    border: "#E0DDD8",
    border2: "#CCCAC5",
    text: "#111111",
    text2: "#2A2A28",
    text3: "#555550",
    navBg: "rgba(246,245,242,0.9)",
    green: "#1A7A45",
    greenDim: "rgba(26,122,69,0.08)",
    red: "#B83232",
    redDim: "rgba(184,50,50,0.08)",
    amber: "#92600A",
    orange: "#0176D3",
    orangeDim: "rgba(1,118,211,0.10)",
    symbolColor: "rgba(0,0,0,0.15)",
  },
  font: {
    sans: "'Inter', sans-serif",
    mono: "'Geist Mono', monospace",
    display: "'Bebas Neue', cursive",
  },
  radius: {
    sm: "4px",
    md: "6px",
    lg: "10px",
  },
  tags: {
    jwt: { bg: "rgba(194,65,12,0.12)", text: "#C2410C" },
    saml: { bg: "rgba(124,58,237,0.08)", text: "#7C3AED" },
    oidc: { bg: "rgba(37,99,235,0.08)", text: "#2563EB" },
    auth0: { bg: "rgba(235,84,36,0.08)", text: "#EA580C" },
  },
};
