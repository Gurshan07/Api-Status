/* ================= CONFIG ================= */

const APIS = {
  moecounter: {
    name: "MoeCounter API",
    url: "https://moecounter.jawandha-moecounter.workers.dev/api/status"
  },
  chatpulse: {
    name: "ChatPulse",
    url: "https://gurshan.vercel.app/"
  }
};

const SLOW_THRESHOLD = 800; // ms
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/* ================= WORKER ================= */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    // ---------- READ ENDPOINTS ----------
    if (url.pathname === "/status") {
      return cors(json(await getAllLatest(env)));
    }

    if (url.pathname === "/history") {
      const id = url.searchParams.get("id");
      if (!id || !APIS[id]) {
        return cors(new Response("Invalid API id", { status: 400 }));
      }
      return cors(json(await getHistory(env, id)));
    }

    return cors(new Response("Not Found", { status: 404 }));
  },

  async scheduled(_, env) {
    for (const id of Object.keys(APIS)) {
      await checkAndStore(env, id);
      await purgeOldData(env, id);
    }
  }
};

/* ================= CORE ================= */

async function checkAndStore(env, id) {
  const api = APIS[id];
  const start = Date.now();

  let status = "DOWN";
  let responseTime = 0;

  try {
    const res = await fetch(api.url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Pulse-Sync-Monitor"
      }
    });

    responseTime = Date.now() - start;

    if (res.ok) {
      let semanticOk = true;

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          const body = await res.clone().json();
          if (body.status && body.status !== "ok") {
            semanticOk = false;
          }
        } catch {
          semanticOk = false;
        }
      }

      if (!semanticOk) {
        status = "DOWN";
      } else if (responseTime > SLOW_THRESHOLD) {
        status = "SLOW";
      } else {
        status = "OPERATIONAL";
      }
    } else {
      status = "DOWN";
    }
  } catch {
    status = "DOWN";
  }

  // 🔒 SNAP TO START OF CURRENT UTC HOUR
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  const entry = {
    timestamp: now.getTime(),
    status,
    responseTime
  };

  await save(env, id, entry);
}

/* ================= STORAGE ================= */

async function save(env, id, entry) {
  const historyKey = `history:${id}`;
  const latestKey = `latest:${id}`;

  // Save latest snapshot
  await env.STATUS_KV.put(latestKey, JSON.stringify(entry));

  const raw = await env.STATUS_KV.get(historyKey);
  const history = raw ? JSON.parse(raw) : [];

  // 🔐 ENSURE ONE ENTRY PER HOUR
  const hourKey = new Date(entry.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH

  const exists = history.some(
    h => new Date(h.timestamp).toISOString().slice(0, 13) === hourKey
  );

  if (!exists) {
    history.push(entry);

    // ✅ ENSURE SORTED ORDER (DEFENSIVE)
    history.sort((a, b) => a.timestamp - b.timestamp);

    await env.STATUS_KV.put(historyKey, JSON.stringify(history));
  }
}

/* ================= RETENTION ================= */

async function purgeOldData(env, id) {
  const key = `history:${id}`;
  const raw = await env.STATUS_KV.get(key);
  if (!raw) return;

  const cutoff = Date.now() - RETENTION_MS;
  const history = JSON.parse(raw);

  const filtered = history.filter(e => e.timestamp >= cutoff);

  if (filtered.length !== history.length) {
    await env.STATUS_KV.put(key, JSON.stringify(filtered));
  }
}

/* ================= READ ================= */

async function getAllLatest(env) {
  const out = {};
  for (const id of Object.keys(APIS)) {
    const raw = await env.STATUS_KV.get(`latest:${id}`);
    out[id] = raw ? JSON.parse(raw) : null;
  }
  return out;
}

async function getHistory(env, id) {
  const raw = await env.STATUS_KV.get(`history:${id}`);
  if (!raw) return [];

  const cutoff = Date.now() - RETENTION_MS;
  return JSON.parse(raw).filter(e => e.timestamp >= cutoff);
}

/* ================= UTIL ================= */

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

function cors(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "no-store");

  return new Response(res.body, {
    status: res.status,
    headers
  });
}
