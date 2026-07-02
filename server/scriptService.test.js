import test from "node:test";
import assert from "node:assert/strict";
import { generateRouterScripts } from "./scriptService.js";

test("generates hotspot and VPN scripts from router settings", () => {
  const router = {
    id: "router-1",
    name: "Office Router",
    host: "192.168.1.1",
    apiPort: 8728,
    hotspotName: "Office WiFi",
    dnsName: "office.wifi",
    username: "admin",
    password: "secret"
  };

  const scripts = generateRouterScripts(router, { type: "full" });

  assert.match(scripts.management, /system identity/);
  assert.match(scripts.management, /ip service/);
  assert.match(scripts.hotspot, /ip hotspot/);
  assert.match(scripts.hotspot, /office.wifi/);
  assert.match(scripts.vpn, /interface wireguard/);
  assert.match(scripts.vpn, /listen-port/);
});
