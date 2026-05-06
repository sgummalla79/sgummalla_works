export interface ParsedUA {
  browser: { name: string; version: string };
  os: { name: string; version: string };
  device: { type: "desktop" | "mobile" | "tablet" | "bot" };
}

export function parseUA(ua: string): ParsedUA {
  if (!ua) return fallback();

  // ── Device type ──────────────────────────────────────────────────────────────
  const isBot =
    /bot|crawl|spider|slurp|mediapartners|lighthouse|headless|prerender/i.test(
      ua,
    );
  const isMobile =
    /Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Android.*Mobile/i.test(
      ua,
    );
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  const deviceType = isBot
    ? "bot"
    : isMobile
      ? "mobile"
      : isTablet
        ? "tablet"
        : "desktop";

  // ── Browser — order matters (Edge before Chrome, OPR before Chrome) ──────────
  let browser = { name: "Unknown", version: "?" };
  let m: RegExpMatchArray | null;

  if ((m = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/)))
    browser = { name: "Edge", version: m[1] };
  else if ((m = ua.match(/OPR\/(\d+)/)))
    browser = { name: "Opera", version: m[1] };
  else if ((m = ua.match(/SamsungBrowser\/(\d+)/)))
    browser = { name: "Samsung", version: m[1] };
  else if ((m = ua.match(/Chrome\/(\d+)/)))
    browser = { name: "Chrome", version: m[1] };
  else if ((m = ua.match(/Firefox\/(\d+)/)))
    browser = { name: "Firefox", version: m[1] };
  else if ((m = ua.match(/Version\/(\d+).*Safari/)))
    browser = { name: "Safari", version: m[1] };
  else if ((m = ua.match(/Safari\/(\d+)/)) && !ua.includes("Chrome"))
    browser = { name: "Safari", version: m[1] };
  else if ((m = ua.match(/MSIE (\d+)/)))
    browser = { name: "IE", version: m[1] };
  else if ((m = ua.match(/Trident\/.*rv:(\d+)/)))
    browser = { name: "IE", version: m[1] };

  // ── OS ───────────────────────────────────────────────────────────────────────
  let os = { name: "Unknown", version: "?" };

  const WIN_VERSIONS: Record<string, string> = {
    "10.0": "10/11",
    "6.3": "8.1",
    "6.2": "8",
    "6.1": "7",
    "6.0": "Vista",
    "5.1": "XP",
  };

  if ((m = ua.match(/Windows NT (\d+\.\d+)/))) {
    os = { name: "Windows", version: WIN_VERSIONS[m[1]] ?? m[1] };
  } else if ((m = ua.match(/iPad.*OS (\d+[._]\d+)/))) {
    os = { name: "iPadOS", version: m[1].replace(/_/g, ".") };
  } else if ((m = ua.match(/iPhone OS (\d+[._]\d+)/))) {
    os = { name: "iOS", version: m[1].replace(/_/g, ".") };
  } else if ((m = ua.match(/Mac OS X (\d+[._]\d+)/))) {
    os = { name: "macOS", version: m[1].replace(/_/g, ".") };
  } else if ((m = ua.match(/Android (\d+(?:\.\d+)*)/))) {
    os = { name: "Android", version: m[1] };
  } else if (/CrOS/.test(ua)) {
    os = { name: "ChromeOS", version: "?" };
  } else if (/Linux/.test(ua)) {
    os = { name: "Linux", version: "?" };
  }

  return { browser, os, device: { type: deviceType } };
}

function fallback(): ParsedUA {
  return {
    browser: { name: "Unknown", version: "?" },
    os: { name: "Unknown", version: "?" },
    device: { type: "desktop" },
  };
}
