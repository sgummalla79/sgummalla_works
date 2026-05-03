const BASE = "/api/profile";

export async function getProfile(): Promise<{ accentColor: string | null }> {
  const res = await fetch(BASE, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function saveProfile(data: {
  accentColor: string;
}): Promise<void> {
  const res = await fetch(BASE, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save profile");
}
