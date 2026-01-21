/* ================= CONFIG ================= */

const APIS = {
  moecounter: {
    name: "MoeCounter API",
    url: "https://cloudflare-worker-monitor-proxy.vercel.app/api/proxy?target=moecounter"
  },
  chatpulse: {
    name: "ChatPulse",
    url: "https://cloudflare-worker-monitor-proxy.vercel.app/api/proxy?target=chatpulse"
  }
};

const SLOW_THRESHOLD = 800;
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/* ================= WORKER ================= */

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    /* ================= ADMIN ENDPOINTS ================= */

    if (request.method === "POST" && url.pathname === "/__reset_today__") {
      const today = new Date().toISOString().split("T")[0];

      for (const id of Object.keys(APIS)) {
        const key = `history:${id}`;
        const raw = await env.STATUS_KV.get(key);
        if (!raw) continue;

        const filtered = JSON.parse(raw).filter(e => {
          const d = new Date(e.timestamp);
          return d.toISOString().split("T")[0] !== today;
        });

        await env.STATUS_KV.put(key, JSON.stringify(filtered));
      }

      return cors(new Response("Today reset complete"));
    }

    if (request.method === "POST" && url.pathname === "/__seed_now__") {
      for (const id of Object.keys(APIS)) {
        await checkAndStore(env, id);
        await purgeOldData(env, id);
      }
      return cors(new Response("Seeded current hour with real checks"));
    }

    /* ================= READ ENDPOINTS ================= */

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

    /* ================= DEBUG ================= */

    if (url.pathname === "/test") {
      const id = url.searchParams.get("id") || "moecounter";
      const api = APIS[id];

      try {
        const res = await fetch(api.url, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Pulse-Sync-Monitor"
          }
        });

        const bodyText = await res.text();
        let bodyParsed = null;
        try { bodyParsed = JSON.parse(bodyText); } catch {}

        return cors(json({
          url: api.url,
          statusCode: res.status,
          contentType: res.headers.get("content-type"),
          bodyPreview: bodyText.slice(0, 300),
          bodyParsed
        }));
      } catch (err) {
        return cors(json({ error: err.message }));
      }
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
      },
      cf: { cacheTtl: 0 }
    });

    responseTime = Date.now() - start;

    if (res.ok) {
      let semanticOk = true;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const body = await res.clone().json().catch(() => null);
        if (body?.status && !["ok", "operational"].includes(String(body.status).toLowerCase())) {
          semanticOk = false;
        }
      }

      if (!semanticOk) status = "DOWN";
      else if (responseTime > SLOW_THRESHOLD) status = "SLOW";
      else status = "OPERATIONAL";
    }
  } catch {
    status = "DOWN";
  }

  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  await save(env, id, {
    timestamp: now.getTime(),
    status,
    responseTime
  });
}

/* ================= STORAGE ================= */

async function save(env, id, entry) {
  const historyKey = `history:${id}`;
  const latestKey = `latest:${id}`;

  await env.STATUS_KV.put(latestKey, JSON.stringify(entry));

  const raw = await env.STATUS_KV.get(historyKey);
  const history = raw ? JSON.parse(raw) : [];

  const hourKey = new Date(entry.timestamp).toISOString().slice(0, 13);
  if (!history.some(h => new Date(h.timestamp).toISOString().slice(0, 13) === hourKey)) {
    history.push(entry);
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
  const filtered = JSON.parse(raw).filter(e => e.timestamp >= cutoff);

  if (filtered.length) {
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
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "no-store");

  return new Response(res.body, { status: res.status, headers });
}
