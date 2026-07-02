import { randomUUID } from "node:crypto";
import { createRouterOsService } from "../server/routerosService.js";
import { generateVoucherBatch } from "../server/voucherService.js";
import { createStore } from "../server/store.js";
import { generateRouterScripts } from "../server/scriptService.js";

const routerOs = createRouterOsService({ mode: process.env.ROUTEROS_MODE || "mock" });
const store = createStore();

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const normalizedParts = parts[0] === "api" ? parts.slice(1) : parts;
  const normalizedPath = normalizedParts.length ? `/${normalizedParts.join("/")}` : "/";

  try {
    if (req.method === "GET" && normalizedPath === "/health") {
      return send(res, 200, { ok: true, mode: routerOs.mode });
    }

    if (req.method === "GET" && normalizedPath === "/routers") {
      return send(res, 200, { routers: store.routers.map(({ password, ...router }) => router) });
    }

    if (req.method === "POST" && normalizedPath === "/routers") {
      const body = await readJson(req);
      const router = store.addRouter({
        ...body,
        host: body.host || process.env.DEFAULT_ROUTER_HOST || "192.168.1.1",
        apiPort: body.apiPort || process.env.DEFAULT_ROUTER_PORT || 8728,
        winboxPort: body.winboxPort || 8291,
        username: body.username || process.env.DEFAULT_ROUTER_USER || "admin",
        password: body.password || process.env.DEFAULT_ROUTER_PASSWORD || "",
        currency: body.currency || "UGX",
        hotspotName: body.hotspotName || body.name || "Hotspot",
        dnsName: body.dnsName || "login.wifi"
      });
      return send(res, 201, { router: { ...router, password: undefined } });
    }

    if (req.method === "GET" && normalizedParts[0] === "routers" && normalizedParts.length === 2) {
      const router = store.findRouter(normalizedParts[1]);
      return send(res, 200, { router: { ...router, password: undefined } });
    }

    if (req.method === "PATCH" && normalizedParts[0] === "routers" && normalizedParts.length === 2) {
      const body = await readJson(req);
      const router = store.updateRouter(normalizedParts[1], body);
      return send(res, 200, { router: { ...router, password: undefined } });
    }

    if (req.method === "DELETE" && normalizedParts[0] === "routers" && normalizedParts.length === 2) {
      store.removeRouter(normalizedParts[1]);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST" && normalizedParts[0] === "routers" && normalizedParts[2] === "test") {
      const router = store.findRouter(normalizedParts[1]);
      const result = await routerOs.testConnection(router);
      router.status = result.connected ? "online" : "offline";
      store.updateRouter(router.id, { status: router.status });
      return send(res, 200, result);
    }

    if (req.method === "GET" && normalizedParts[0] === "routers" && normalizedParts[2] === "summary") {
      const router = store.findRouter(normalizedParts[1]);
      return send(res, 200, await routerOs.getSummary(router));
    }

    if (req.method === "GET" && normalizedParts[0] === "routers" && normalizedParts[2] === "hotspot-users") {
      const router = store.findRouter(normalizedParts[1]);
      return send(res, 200, { users: await routerOs.getHotspotUsers(router) });
    }

    if (req.method === "PATCH" && normalizedParts[0] === "routers" && normalizedParts[2] === "hotspot-users") {
      const router = store.findRouter(normalizedParts[1]);
      const body = await readJson(req);
      const result = await routerOs.setHotspotUser(router, normalizedParts[3], body);
      return send(res, 200, result);
    }

    if (req.method === "POST" && normalizedParts[0] === "routers" && normalizedParts[2] === "vouchers") {
      const router = store.findRouter(normalizedParts[1]);
      const body = await readJson(req);
      const vouchers = generateVoucherBatch(body, router);
      await routerOs.createHotspotUsers(router, vouchers, body);
      store.addVoucherBatch({
        id: randomUUID(),
        routerId: router.id,
        createdAt: new Date().toISOString(),
        profile: body.profile || "default",
        vouchers
      });
      return send(res, 201, { vouchers });
    }

    if (req.method === "GET" && normalizedPath === "/voucher-batches") {
      return send(res, 200, { batches: store.voucherBatches });
    }

    if (req.method === "POST" && normalizedParts[0] === "routers" && normalizedParts[2] === "scripts") {
      const router = store.findRouter(normalizedParts[1]);
      const body = await readJson(req);
      return send(res, 200, { scripts: generateRouterScripts(router, body) });
    }

    if (req.method === "GET" && normalizedParts[0] === "routers" && normalizedParts[2] === "remote-access") {
      const router = store.findRouter(normalizedParts[1]);
      return send(res, 200, {
        winbox: `winbox://${router.host}:${router.winboxPort}`,
        webfig: `http://${router.host}`,
        note: "Online Winbox needs the server/client network to reach this router through public routing, VPN, or a gateway."
      });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message || "Server error" });
  }
}
