// Shared logic for resolving a public Instagram reel URL to a direct video
// URL. Used by both the Vercel (api/download.js) and Netlify
// (netlify/functions/download.js) function adapters.
//
// This relies on two undocumented-but-widely-used techniques (in order):
// the internal media-info endpoint keyed by app id, then falling back to
// scraping the public embed page. Both only work for PUBLIC posts and can
// break at any time if Instagram changes its markup.

const APP_ID = "936619743392459";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SHORTCODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function extractShortcode(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)instagram\.com$/.test(url.hostname)) return null;
  const match = url.pathname.match(/\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

function shortcodeToMediaId(shortcode) {
  let id = 0n;
  for (const char of shortcode) {
    const value = SHORTCODE_ALPHABET.indexOf(char);
    if (value === -1) return null;
    id = id * 64n + BigInt(value);
  }
  return id.toString();
}

async function fetchViaMediaInfo(shortcode) {
  const mediaId = shortcodeToMediaId(shortcode);
  if (!mediaId) return null;

  const res = await fetch(
    `https://i.instagram.com/api/v1/media/${mediaId}/info/`,
    {
      headers: {
        "X-IG-App-ID": APP_ID,
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const item = data?.items?.[0];
  const videoUrl = item?.video_versions?.[0]?.url;
  if (!videoUrl) return null;

  return {
    videoUrl,
    thumbnailUrl: item?.image_versions2?.candidates?.[0]?.url || null,
    caption: item?.caption?.text || "",
  };
}

async function fetchViaEmbedPage(shortcode) {
  const res = await fetch(
    `https://www.instagram.com/reel/${shortcode}/embed/captioned/`,
    { headers: { "User-Agent": BROWSER_UA } }
  );
  if (!res.ok) return null;

  const html = await res.text();
  const videoMatch = html.match(/"video_url":"([^"]+)"/);
  if (!videoMatch) return null;

  const videoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  const thumbMatch = html.match(/"display_url":"([^"]+)"/);
  const thumbnailUrl = thumbMatch
    ? thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/")
    : null;
  const captionMatch = html.match(/"caption":"((?:[^"\\]|\\.)*)"/);
  const caption = captionMatch
    ? captionMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    : "";

  return { videoUrl, thumbnailUrl, caption };
}

// Returns { ok: true, data } or { ok: false, status, error }
async function resolveReel(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { ok: false, status: 400, error: "Missing 'url' in request body." };
  }

  const shortcode = extractShortcode(rawUrl.trim());
  if (!shortcode) {
    return {
      ok: false,
      status: 400,
      error:
        "That doesn't look like a valid Instagram reel/post URL, e.g. https://www.instagram.com/reel/XXXXXXXXXXX/",
    };
  }

  try {
    const result =
      (await fetchViaMediaInfo(shortcode).catch(() => null)) ||
      (await fetchViaEmbedPage(shortcode).catch(() => null));

    if (!result) {
      return {
        ok: false,
        status: 404,
        error:
          "Couldn't find a downloadable video for that link. It may be private, deleted, or Instagram may be blocking this request right now — please try again later.",
      };
    }

    return { ok: true, data: result };
  } catch {
    return {
      ok: false,
      status: 502,
      error: "Instagram request failed. Please try again in a moment.",
    };
  }
}

module.exports = { resolveReel };
