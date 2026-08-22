# Reel Saver

A small website for downloading **public** Instagram Reels: paste a link, get
a direct video download.

Static frontend (`index.html`) + a serverless function that fetches the
reel's video URL server-side (Instagram blocks this from the browser via
CORS). The same logic (`lib/instagram.js`) is wired up for both Vercel and
Netlify so you can deploy to either with no code changes.

## How it works

Instagram doesn't publish a "download reel" API. This uses two
undocumented-but-commonly-used techniques, in order:

1. Instagram's internal `i.instagram.com/api/v1/media/{id}/info/` endpoint,
   called with the public web app id header.
2. Falling back to scraping the reel's public embed page
   (`instagram.com/reel/{shortcode}/embed/captioned/`) for the embedded
   `video_url`.

Both only work for **public** posts, and both can stop working at any time
if Instagram changes its markup or blocks the request — there's no
guarantee of long-term reliability. If you need something more robust,
consider swapping the backend for [yt-dlp](https://github.com/yt-dlp/yt-dlp)
(actively maintained, handles more edge cases, but needs a host that can run
a Python binary rather than a lightweight serverless function).

## Deploy

### Vercel

```
cd reel-downloader
vercel deploy
```

Vercel auto-detects `index.html` as static and `api/download.js` as a
serverless function. No config needed.

### Netlify

```
cd reel-downloader
netlify deploy
```

`netlify.toml` publishes the root as the site and wires
`netlify/functions/download.js` up behind `/api/download`.

## Local development

Both platforms have a CLI that emulates functions locally:

```
npx vercel dev
# or
npx netlify dev
```

Then open the local URL it prints.

## Usage and legal note

Only download content you own or have explicit permission to reuse.
Downloading and republishing someone else's Instagram content without
permission can violate their rights and Instagram's Terms of Service — this
tool doesn't grant any rights to the media it fetches.
