const SIMKL_API = "https://api.simkl.com";
const APP_NAME = "ola-studio-portfolio";
const APP_VERSION = "1.0";

function posterUrl(poster) {
  if (!poster) return null;
  return (
    "https://wsrv.nl/?url=" +
    encodeURIComponent(`https://simkl.in/posters/${poster}_m.webp`) +
    "&q=90"
  );
}

function parseEpisodeCode(code) {
  if (!code || typeof code !== "string") return { season: null, episode: null };
  const match = code.trim().match(/^S(\d+)E(\d+)$/i);
  if (!match) return { season: null, episode: null };
  return {
    season: Number(match[1]),
    episode: Number(match[2]),
  };
}

function simklHeaders(clientId, accessToken) {
  return {
    Accept: "application/json",
    "User-Agent": `${APP_NAME}/${APP_VERSION}`,
    "simkl-api-key": clientId,
    Authorization: `Bearer ${accessToken}`,
  };
}

async function fetchWatchingList(kind, clientId, accessToken) {
  const url =
    `${SIMKL_API}/sync/all-items/${kind}/watching` +
    `?next_watch_info=yes&client_id=${encodeURIComponent(clientId)}`;

  const response = await fetch(url, {
    headers: simklHeaders(clientId, accessToken),
  });

  if (response.status === 401 || response.status === 403) {
    const error = new Error("simkl_unauthorized");
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error("simkl_unavailable");
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  const items = Array.isArray(data?.[kind]) ? data[kind] : [];
  const mediaKey = kind === "anime" ? "anime" : "show";

  return items.map((item) => ({
    title: item?.[mediaKey]?.title || null,
    poster: posterUrl(item?.[mediaKey]?.poster),
    lastWatchedAt: item?.last_watched_at || null,
    lastWatched: item?.last_watched || null,
    nextInfo: item?.next_to_watch_info || null,
    watched: Number(item?.watched_episodes_count) || 0,
    total: Number(item?.total_episodes_count) || 0,
  }));
}

function toPublicWatching(item) {
  if (!item) {
    return {
      title: null,
      poster: null,
      season: null,
      episode: null,
      episodeTitle: null,
      lastWatchedAt: null,
      progress: { watched: 0, total: 0 },
    };
  }

  const fromLast = parseEpisodeCode(item.lastWatched);
  const nextSeason = item.nextInfo?.season ?? null;
  const nextEpisode = item.nextInfo?.episode ?? null;
  const sameEpisode =
    fromLast.season != null &&
    fromLast.episode != null &&
    nextSeason === fromLast.season &&
    nextEpisode === fromLast.episode;

  return {
    title: item.title,
    poster: item.poster,
    season: fromLast.season,
    episode: fromLast.episode,
    episodeTitle: sameEpisode ? item.nextInfo?.title || null : null,
    lastWatchedAt: item.lastWatchedAt,
    progress: {
      watched: item.watched,
      total: item.total,
    },
  };
}

function emptyWatching(errorCode) {
  return {
    error: errorCode,
    fallback: true,
    title: null,
    poster: null,
    season: null,
    episode: null,
    episodeTitle: null,
    lastWatchedAt: null,
    progress: { watched: 0, total: 0 },
  };
}

async function getPublicWatching(clientId, accessToken) {
  const [shows, anime] = await Promise.all([
    fetchWatchingList("shows", clientId, accessToken),
    fetchWatchingList("anime", clientId, accessToken),
  ]);

  const latest = [...shows, ...anime]
    .filter((item) => item.title)
    .sort((a, b) => {
      const aTime = Date.parse(a.lastWatchedAt || 0) || 0;
      const bTime = Date.parse(b.lastWatchedAt || 0) || 0;
      return bTime - aTime;
    })[0];

  return toPublicWatching(latest);
}

module.exports = {
  APP_NAME,
  APP_VERSION,
  SIMKL_API,
  emptyWatching,
  getPublicWatching,
};
