// Vercel serverless function adapter: POST { url } -> { videoUrl, thumbnailUrl, caption }
const { resolveReel } = require("../lib/instagram");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const result = await resolveReel(req.body?.url);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(200).json(result.data);
};
