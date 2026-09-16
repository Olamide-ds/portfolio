const { emptyWatching, getPublicWatching } = require("./_lib/simkl");
const { loadLocalSimklEnv } = require("./_lib/load-env");

loadLocalSimklEnv();

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    json(res, 405, emptyWatching("method_not_allowed"));
    return;
  }

  const clientId = process.env.SIMKL_CLIENT_ID;
  const accessToken = process.env.SIMKL_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    json(res, 200, emptyWatching("simkl_not_configured"));
    return;
  }

  try {
    const watching = await getPublicWatching(clientId, accessToken);
    json(res, 200, watching);
  } catch (error) {
    const code =
      error && error.status === 401 ? "simkl_unauthorized" : "simkl_unavailable";
    json(res, 200, emptyWatching(code));
  }
};
