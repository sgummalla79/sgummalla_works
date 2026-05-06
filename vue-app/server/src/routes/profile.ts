import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import sql from "../lib/db.js";

const router: Router = Router();

router.get("/", requireAuth, async (req, res) => {
  const [row] = await sql<{ accent_color: string | null }[]>`
    SELECT accent_color FROM user_profiles WHERE user_id = ${req.user!.id}
  `;
  res.json({ accentColor: row?.accent_color ?? null });
});

router.put("/", requireAuth, async (req, res) => {
  const { accentColor } = req.body as { accentColor?: string };
  if (!accentColor || !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    res.status(400).json({ error: "Invalid accentColor" });
    return;
  }
  await sql`
    INSERT INTO user_profiles (user_id, accent_color)
    VALUES (${req.user!.id}, ${accentColor})
    ON CONFLICT (user_id) DO UPDATE SET
      accent_color = EXCLUDED.accent_color,
      updated_at   = now()
  `;
  res.json({ ok: true });
});

export default router;
