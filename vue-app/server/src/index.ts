import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import auth0Router from "./routes/auth0.js";
import samlRouter from "./routes/saml.js";
import portalsRouter from "./routes/portals.js";
import samlIdpRouter from "./routes/samlIdp.js";
import oidcIdpRouter from "./routes/oidcIdp.js";
import articlesRouter from "./routes/articles.js";
import salesforceRouter from "./routes/salesforce.js";
import salesforceExchangeRouter from "./routes/salesforceExchange.js";
import { ensureTables } from "./lib/ensureTables.js";
import { requestLogger } from "./middleware/requestLogger.js";
import usageRouter from "./routes/usage.js";
import profileRouter from "./routes/profile.js";
import { appLogger } from "./lib/logger.js";
import { ConsoleSink } from "./lib/sinks/console.js";
import { FileSink } from "./lib/sinks/file.js";
import { FirestoreSink } from "./lib/sinks/firestore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app: express.Application = express();
const PORT = Number(process.env.PORT ?? 3000);
const isProd = process.env.NODE_ENV === "production";

// ── Canonical host redirect (production only) ─────────────────────────────────
const CANONICAL_HOST = process.env.CANONICAL_HOST;
if (isProd && CANONICAL_HOST) {
  app.use((req, res, next) => {
    if (req.hostname !== CANONICAL_HOST) {
      return res.redirect(301, `https://${CANONICAL_HOST}${req.url}`);
    }
    next();
  });
}

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api/usage", usageRouter);
app.use("/api/profile", profileRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth0", auth0Router);
app.use("/api/saml", samlRouter);
app.use("/api/portals", portalsRouter);
app.use("/api/saml", samlIdpRouter);
app.use("/api/oidc", oidcIdpRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/salesforce", salesforceRouter);
app.use("/api/salesforce-exchange", salesforceExchangeRouter);

// ── Static files (production) ─────────────────────────────────────────────────
if (isProd) {
  const publicPath = join(__dirname, "../../public");
  app.use(express.static(publicPath));
  app.get("*", (_req, res) => {
    res.sendFile(join(publicPath, "index.html"));
  });
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[Sgummalla Works]", err.message);
    res.status(500).json({
      error: "Internal Server Error",
      message: isProd ? undefined : err.message,
    });
  },
);

// ── Start ─────────────────────────────────────────────────────────────────────
// Use http.createServer so Vite's HMR WebSocket can share the same server
// in dev — no separate port, no proxy.
const httpServer = createServer(app);

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: join(__dirname, "../../client/vite.config.ts"),
    root: join(__dirname, "../../client"),
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

await ensureTables();

// ── Register log sinks ────────────────────────────────────────────────────────
// DEV:  ConsoleSink + FileSink → server/logs/YYYY-MM-DD.log (git/docker ignored)
// PROD: FirestoreSink (30d TTL)
if (!isProd) {
  appLogger.register(new ConsoleSink());
  appLogger.register(new FileSink(join(process.cwd(), "logs")));
  console.log("[Logger] ConsoleSink + FileSink registered (dev → logs/)");
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  appLogger.register(new FirestoreSink(30 * 24 * 60 * 60 * 1000));
  console.log("[Logger] FirestoreSink registered (prod 30d)");
} else {
  console.warn(
    "[Logger] FIREBASE_SERVICE_ACCOUNT not set — FirestoreSink disabled",
  );
}

httpServer.listen(PORT, () => {
  console.log(`[Sgummalla Works] Server running on http://localhost:${PORT}`);
  console.log(
    `[Sgummalla Works] Environment: ${process.env.NODE_ENV ?? "development"}`,
  );
});

export default app;
