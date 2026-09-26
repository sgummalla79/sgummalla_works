import {
  mountLightningOut,
  waitForLightningOutComponents,
} from "../utils/lightningOut";
import {
  HOST_MESSAGE,
  type HostToPanel,
  type PanelToHost,
} from "../utils/lightningOutFrameProtocol";

// Runs inside the panel's dedicated frame. The panel throws this whole page away
// after every session, so Lightning Out always starts from a clean runtime.

const root = document.getElementById("root");
const ownOrigin = window.location.origin;

function notifyPanel(message: HostToPanel): void {
  window.parent.postMessage(message, ownOrigin);
}

let mounted = false;

window.addEventListener("message", async (event: MessageEvent) => {
  // Only the embedding panel, same origin, may drive this page.
  if (event.source !== window.parent || event.origin !== ownOrigin) return;

  const message = event.data as PanelToHost | undefined;
  if (message?.type !== HOST_MESSAGE.MOUNT || mounted || !root) return;
  mounted = true;

  try {
    await mountLightningOut(root, message.session);
    await waitForLightningOutComponents(message.session.components);
    notifyPanel({ type: HOST_MESSAGE.STATUS, state: "ready" });
  } catch (err) {
    notifyPanel({
      type: HOST_MESSAGE.STATUS,
      state: "error",
      message:
        err instanceof Error ? err.message : "Lightning Out failed to load",
    });
  }
});

// Registered above, so the panel can safely send the session as soon as it sees this.
notifyPanel({ type: HOST_MESSAGE.READY });
