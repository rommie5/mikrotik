function escapeValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function generateRouterScripts(router, options = {}) {
  const hotspotName = router.hotspotName || router.name || "Hotspot";
  const dnsName = router.dnsName || "login.wifi";
  const adminUser = router.username || "admin";
  const adminPassword = router.password || "";
  const type = options.type || "full";

  const management = [
    `/system identity set name="${escapeValue(router.name)}"`,
    `/user add name="${escapeValue(adminUser)}" group=full password="${escapeValue(adminPassword)}"`,
    `/ip service set api disabled=no port=${router.apiPort || 8728}`,
    `/ip service set winbox disabled=no port=${router.winboxPort || 8291}`,
    "/ip dns set allow-remote-requests=yes",
    "/system clock set time-zone-name=UTC"
  ].join("\n");

  const hotspot = [
    "/ip hotspot setup",
    `set hotspot-name="${escapeValue(hotspotName)}"`,
    "set interface=bridge1",
    "set address-pool=hotspot-pool",
    "set profile=hsprof1",
    `set dns-name="${escapeValue(dnsName)}"`,
    "set login-by=http-chap",
    "set name-server=8.8.8.8",
    "set use-radius=no"
  ].join("\n");

  const vpn = [
    "/interface wireguard",
    "add name=wg0 listen-port=13231 mtu=1420 private-key=\"MMo6Ct8NsYLsC5VGmihUBo7J+7Nq8tUlYXTyf+cLn1k=\"",
    "/interface wireguard peers",
    "add interface=wg0 allowed-address=192.168.88.2/32 comment=\"xenfi-remote\" endpoint-address=\"\" endpoint-port=13231 public-key=\"ot9dnJ18t/8+iE5BH89lqovD4c2QXQAzK2bdiS5eWC8=\"",
    "/ip address add address=10.10.10.1/24 interface=wg0",
    "/ip route add dst-address=10.10.10.0/24 gateway=wg0"
  ].join("\n");

  const scripts = {
    management,
    hotspot,
    vpn,
    summary: [
      `# Router: ${router.name}`,
      `# Hotspot: ${hotspotName}`,
      `# DNS: ${dnsName}`,
      `# Remote access: WireGuard via wg0`
    ].join("\n")
  };

  return type === "minimal"
    ? { management: management.split("\n").slice(0, 3).join("\n"), hotspot: hotspot.split("\n").slice(0, 2).join("\n"), vpn: vpn.split("\n").slice(0, 2).join("\n"), summary: scripts.summary }
    : scripts;
}
