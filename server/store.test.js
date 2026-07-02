import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createStore } from "./store.js";

test("store persists routers between instances", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "xenfi-store-"));
  const filePath = path.join(dir, "store.json");

  try {
    const store = createStore({ dataFile: filePath });
    const router = store.addRouter({
      name: "Office Router",
      host: "10.0.0.2",
      apiPort: 8728,
      winboxPort: 8291,
      username: "admin",
      password: "secret",
      currency: "USD",
      hotspotName: "Office WiFi",
      dnsName: "office.wifi"
    });

    assert.equal(store.routers.length, 1);
    assert.equal(router.name, "Office Router");

    const reloaded = createStore({ dataFile: filePath });
    assert.equal(reloaded.routers.length, 1);
    assert.equal(reloaded.routers[0].name, "Office Router");
    assert.equal(reloaded.routers[0].host, "10.0.0.2");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
