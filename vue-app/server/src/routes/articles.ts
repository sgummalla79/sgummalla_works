import { Router, type Request, type Response } from "express";
import neon from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { appLogger, buildBase } from "../lib/logger.js";
import { LogRecordType } from "../lib/logTypes.js";
import type { LogRecord, BlogViewData } from "../lib/logTypes.js";
import { parseUA } from "../lib/uaParser.js";

const router: import("express").Router = Router();

function buildVisitorData(
  req: Request,
): Omit<BlogViewData, "articleSlug" | "articleTitle"> {
  const ua = req.headers["user-agent"] ?? "";
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ??
    req.ip ??
    "";
  const referer = req.headers["referer"] ?? "";
  const language =
    (req.headers["accept-language"] ?? "").split(",")[0]?.trim() ?? "unknown";

  let refererSource: BlogViewData["refererSource"] = "direct";
  if (referer) {
    if (referer.includes(req.hostname)) refererSource = "internal";
    else if (/google|bing|yahoo|duckduckgo|baidu/i.test(referer))
      refererSource = "search";
    else if (/twitter|facebook|linkedin|instagram|reddit/i.test(referer))
      refererSource = "social";
    else refererSource = "unknown";
  }

  const { browser, os, device } = parseUA(ua);
  const isBot = device.type === "bot";

  return {
    ip,
    userAgent: ua,
    browser,
    os,
    device,
    referer,
    refererSource,
    language,
    isBot,
    userId: req.user?.id,
  };
}

// ── GET /api/articles ─────────────────────────────────────────────────────────
// Returns list without content (for blog index)

router.get("/", async (req: Request, res: Response) => {
  const articles = await neon<
    {
      slug: string;
      title: string;
      subtitle: string;
      date: string;
      tags: string[];
      description: string;
    }[]
  >`
    SELECT slug, title, subtitle, date, tags, description
    FROM articles
    WHERE published = true
    ORDER BY created_at DESC
  `;
  appLogger.emit({
    ...buildBase(LogRecordType.BLOGVIEW),
    logType: LogRecordType.BLOGVIEW,
    data: buildVisitorData(req),
  } as LogRecord);
  res.json(articles);
});

// ── GET /api/articles/drafts ──────────────────────────────────────────────────
// Owner only — list unpublished articles
// NOTE: must be defined before /:slug to avoid Express matching "drafts" as a slug

router.get("/drafts", requireAuth, async (_req: Request, res: Response) => {
  const articles = await neon<
    {
      slug: string;
      title: string;
      subtitle: string;
      date: string;
      tags: string[];
      description: string;
    }[]
  >`
    SELECT slug, title, subtitle, date, tags, description
    FROM articles
    WHERE published = false
    ORDER BY created_at DESC
  `;
  res.json(articles);
});

// ── GET /api/articles/drafts/:slug ────────────────────────────────────────────
// Owner only — single draft with full content for preview

router.get(
  "/drafts/:slug",
  requireAuth,
  async (req: Request, res: Response) => {
    const [article] = await neon<
      {
        slug: string;
        title: string;
        subtitle: string;
        date: string;
        tags: string[];
        description: string;
        content: string;
      }[]
    >`
    SELECT slug, title, subtitle, date, tags, description, content
    FROM articles
    WHERE slug = ${req.params.slug}
      AND published = false
  `;
    if (!article) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    res.json(article);
  },
);

// ── PATCH /api/articles/drafts/:slug/publish ──────────────────────────────────
// Owner only — publish a draft article

router.patch(
  "/drafts/:slug/publish",
  requireAuth,
  async (req: Request, res: Response) => {
    const result = await neon`
    UPDATE articles
    SET published  = true,
        updated_at = now()
    WHERE slug    = ${req.params.slug}
      AND published = false
    RETURNING slug
  `;
    if (result.length === 0) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    res.json({ ok: true, slug: req.params.slug });
  },
);

// ── GET /api/articles/:slug ───────────────────────────────────────────────────
// Returns single published article with full content

router.get("/:slug", async (req: Request, res: Response) => {
  const [article] = await neon<
    {
      slug: string;
      title: string;
      subtitle: string;
      date: string;
      tags: string[];
      description: string;
      content: string;
    }[]
  >`
    SELECT slug, title, subtitle, date, tags, description, content
    FROM articles
    WHERE slug = ${req.params.slug}
      AND published = true
  `;
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  appLogger.emit({
    ...buildBase(LogRecordType.ARTVIEW),
    logType: LogRecordType.ARTVIEW,
    data: {
      ...buildVisitorData(req),
      articleSlug: article.slug,
      articleTitle: article.title,
    },
  } as LogRecord);
  res.json(article);
});

export default router;
