// Netlify Functions adapter: POST { url } -> { videoUrl, thumbnailUrl, caption }
const { resolveReel } = require("../../lib/instagram");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  const result = await resolveReel(body.url);

  if (!result.ok) {
    return {
      statusCode: result.status,
      body: JSON.stringify({ error: result.error }),
    };
  }

  return { statusCode: 200, body: JSON.stringify(result.data) };
};
