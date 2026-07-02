import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const defaultDataFile = process.env.STORE_FILE || (process.env.VERCEL || process.env.VERCEL_ENV
  ? path.resolve(os.tmpdir(), "xenfi-online-store.json")
  : path.resolve(process.cwd(), "server", "data", "store.json"));

function normalizeRouter(input) {
  return {
    id: input.id || randomUUID(),
    name: input.name || "New router",
    host: input.host || "192.168.1.1",
    apiPort: Number(input.apiPort || 8728),
    winboxPort: Number(input.winboxPort || 8291),
    username: input.username || "admin",
    password: input.password || "",
    currency: input.currency || "UGX",
    hotspotName: input.hotspotName || input.name || "Hotspot",
    dnsName: input.dnsName || "login.wifi",
    status: input.status || "unknown"
  };
}

export function createStore({ dataFile = defaultDataFile } = {}) {
  const resolvedDataFile = path.resolve(dataFile);
  const directory = path.dirname(resolvedDataFile);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });

  function readState() {
    if (!existsSync(resolvedDataFile)) return { routers: [], voucherBatches: [] };

    try {
      const parsed = JSON.parse(readFileSync(resolvedDataFile, "utf8"));
      return {
        routers: Array.isArray(parsed.routers) ? parsed.routers : [],
        voucherBatches: Array.isArray(parsed.voucherBatches) ? parsed.voucherBatches : []
      };
    } catch {
      return { routers: [], voucherBatches: [] };
    }
  }

  let state = readState();

  function saveState() {
    writeFileSync(resolvedDataFile, JSON.stringify(state, null, 2));
  }

  return {
    get routers() {
      return state.routers;
    },
    get voucherBatches() {
      return state.voucherBatches;
    },
    findRouter(id) {
      const router = state.routers.find((item) => item.id === id);
      if (!router) {
        const error = new Error("Router not found");
        error.status = 404;
        throw error;
      }
      return router;
    },
    addRouter(input) {
      const router = normalizeRouter(input);
      state.routers.unshift(router);
      saveState();
      return router;
    },
    updateRouter(id, patch) {
      const router = this.findRouter(id);
      const updated = { ...router, ...patch, id: router.id };
      state.routers = state.routers.map((item) => (item.id === id ? updated : item));
      saveState();
      return updated;
    },
    removeRouter(id) {
      const router = this.findRouter(id);
      state.routers = state.routers.filter((item) => item.id !== id);
      saveState();
      return router;
    },
    addVoucherBatch(batch) {
      state.voucherBatches.unshift(batch);
      saveState();
      return batch;
    }
  };
}

export const store = createStore();
