// Messages between the Lightning Out panel and its isolated host frame.
//
// Lightning Out 2.0 cannot be re-initialised inside a page, so the panel runs it
// in a frame of its own (the host page) and replaces that frame for every
// connect. The session — which contains a single-use frontdoor URL — travels by
// postMessage to the same origin only, never in a URL.

// Static page served next to the app (built from lightning-out-host.html).
export const LIGHTNING_OUT_HOST_PATH = "/lightning-out-host.html";

export const HOST_MESSAGE = {
  // host → panel: the host is listening and can be sent a session
  READY: "lightning-out:ready",
  // panel → host: mount this session
  MOUNT: "lightning-out:mount",
  // host → panel: the outcome of mounting
  STATUS: "lightning-out:status",
} as const;

// Only what the host needs to mount; deliberately excludes identity and logs.
export interface MountableSession {
  frontdoorUrl: string;
  scriptUrl: string;
  appId: string;
  components: string[];
}

export type PanelToHost = {
  type: typeof HOST_MESSAGE.MOUNT;
  session: MountableSession;
};

export type HostToPanel =
  | { type: typeof HOST_MESSAGE.READY }
  | { type: typeof HOST_MESSAGE.STATUS; state: "ready" }
  | { type: typeof HOST_MESSAGE.STATUS; state: "error"; message: string };
