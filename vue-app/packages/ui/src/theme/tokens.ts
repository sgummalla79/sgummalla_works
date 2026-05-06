export interface SgwTheme {
  name: string;
  colors: {
    bg: string;
    bg2: string;
    surface: string;
    surface2: string;
    border: string;
    border2: string;
    text: string;
    text2: string;
    text3: string;
    navBg: string;
    green: string;
    greenDim: string;
    red: string;
    redDim: string;
    amber: string;
    orange: string;
    orangeDim: string;
    symbolColor: string;
  };
  font: {
    sans: string;
    mono: string;
    display: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  tags: {
    jwt: { bg: string; text: string };
    saml: { bg: string; text: string };
    oidc: { bg: string; text: string };
    auth0: { bg: string; text: string };
  };
}

export const cssVarMap: Record<string, string> = {
  "colors.bg": "--vz-bg",
  "colors.bg2": "--vz-bg2",
  "colors.surface": "--vz-surface",
  "colors.surface2": "--vz-surface2",
  "colors.border": "--vz-border",
  "colors.border2": "--vz-border2",
  "colors.text": "--vz-text",
  "colors.text2": "--vz-text2",
  "colors.text3": "--vz-text3",
  "colors.navBg": "--vz-nav-bg",
  "colors.green": "--vz-green",
  "colors.greenDim": "--vz-green-dim",
  "colors.red": "--vz-red",
  "colors.redDim": "--vz-red-dim",
  "colors.amber": "--vz-amber",
  "colors.orange": "--vz-orange",
  "colors.orangeDim": "--vz-orange-dim",
  "colors.symbolColor": "--vz-symbol-color",
  "font.sans": "--vz-font-sans",
  "font.mono": "--vz-font-mono",
  "font.display": "--vz-font-display",
  "radius.sm": "--vz-radius-sm",
  "radius.md": "--vz-radius-md",
  "radius.lg": "--vz-radius-lg",
  "tags.jwt.bg": "--vz-tag-jwt-bg",
  "tags.jwt.text": "--vz-tag-jwt-text",
  "tags.saml.bg": "--vz-tag-saml-bg",
  "tags.saml.text": "--vz-tag-saml-text",
  "tags.oidc.bg": "--vz-tag-oidc-bg",
  "tags.oidc.text": "--vz-tag-oidc-text",
  "tags.auth0.bg": "--vz-tag-auth0-bg",
  "tags.auth0.text": "--vz-tag-auth0-text",
};

/** Resolves a dot-path like "colors.bg" against a theme object — always returns string */
export function resolveThemeValue(theme: SgwTheme, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (obj, key) =>
        obj && typeof obj === "object"
          ? (obj as Record<string, unknown>)[key]
          : undefined,
      theme,
    );
  return typeof value === "string" ? value : "";
}
