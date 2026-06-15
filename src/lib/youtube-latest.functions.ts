import { createServerFn } from "@tanstack/react-start";

// In-memory per-worker cache: channelId -> { videoId, fetchedAt }
const cache = new Map<string, { videoId: string; fetchedAt: number }>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export const getLatestYoutubeVideo = createServerFn({ method: "GET" })
  .inputValidator((data: { channelId: string }) => {
    const id = String(data?.channelId ?? "").trim();
    if (!id) throw new Error("channelId required");
    return { channelId: id };
  })
  .handler(async ({ data }): Promise<{ videoId: string | null; error?: string; cached?: boolean }> => {
    const now = Date.now();
    const hit = cache.get(data.channelId);
    if (hit && now - hit.fetchedAt < TTL_MS) {
      return { videoId: hit.videoId, cached: true };
    }
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return { videoId: hit?.videoId ?? null, error: "YOUTUBE_API_KEY not configured" };
    }
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("channelId", data.channelId);
      url.searchParams.set("part", "id");
      url.searchParams.set("order", "date");
      url.searchParams.set("type", "video");
      url.searchParams.set("maxResults", "1");
      const res = await fetch(url.toString());
      if (!res.ok) {
        return { videoId: hit?.videoId ?? null, error: `YouTube API ${res.status}` };
      }
      const json = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
      const videoId = json.items?.[0]?.id?.videoId ?? null;
      if (videoId) {
        cache.set(data.channelId, { videoId, fetchedAt: now });
        return { videoId, cached: false };
      }
      return { videoId: hit?.videoId ?? null, error: "No videos found" };
    } catch (e) {
      return { videoId: hit?.videoId ?? null, error: e instanceof Error ? e.message : "fetch failed" };
    }
  });

/** Extract an 11-char YouTube video ID from a URL or raw ID. */
export function extractYoutubeId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // fallthrough
  }
  const m = s.match(/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}