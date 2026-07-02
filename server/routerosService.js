const mockUsers = [];

export function createRouterOsService({ mode }) {
  if (mode === "live") return liveService;
  return mockService;
}

const mockService = {
  mode: "mock",
  async testConnection(router) {
    return { connected: true, identity: `${router.name} Demo`, mode: "mock" };
  },
  async getSummary(router) {
    return {
      identity: `${router.name} Demo`,
      uptime: "0s",
      cpuLoad: 0,
      memoryUsed: 0,
      activeUsers: mockUsers.filter((user) => !user.disabled).length,
      totalUsers: mockUsers.length,
      downloadMbps: 0,
      uploadMbps: 0
    };
  },
  async getHotspotUsers() {
    return mockUsers;
  },
  async setHotspotUser(_router, id, patch) {
    const user = mockUsers.find((item) => item.id === id);
    if (!user) return { ok: false };
    if (typeof patch.disabled === "boolean") user.disabled = patch.disabled;
    return { ok: true, user };
  },
  async createHotspotUsers(_router, vouchers) {
    vouchers.forEach((voucher) => {
      mockUsers.unshift({
        id: `*${mockUsers.length + 1}`,
        name: voucher.username,
        profile: voucher.profile,
        uptime: "0s",
        disabled: false,
        comment: voucher.comment
      });
    });
    return { ok: true };
  }
};

const liveService = {
  mode: "live",
  async connect(router) {
    const { RouterOSClient } = await import("routeros-client");
    const client = new RouterOSClient({
      host: router.host,
      port: router.apiPort,
      user: router.username,
      password: router.password,
      timeout: 5000
    });
    await client.connect();
    return client;
  },
  async testConnection(router) {
    const client = await this.connect(router);
    const [identity] = await client.menu("/system/identity").get();
    await client.close();
    return { connected: true, identity: identity?.name || router.name, mode: "live" };
  },
  async getSummary(router) {
    const client = await this.connect(router);
    const [identity] = await client.menu("/system/identity").get();
    const [resource] = await client.menu("/system/resource").get();
    const users = await client.menu("/ip/hotspot/user").get();
    const active = await client.menu("/ip/hotspot/active").get();
    await client.close();
    return {
      identity: identity?.name || router.name,
      uptime: resource?.uptime || "",
      cpuLoad: Number(resource?.["cpu-load"] || 0),
      memoryUsed: 0,
      activeUsers: active.length,
      totalUsers: users.length,
      downloadMbps: 0,
      uploadMbps: 0
    };
  },
  async getHotspotUsers(router) {
    const client = await this.connect(router);
    const users = await client.menu("/ip/hotspot/user").get();
    await client.close();
    return users.map((user) => ({
      id: user[".id"],
      name: user.name,
      profile: user.profile,
      uptime: user.uptime || "0s",
      disabled: user.disabled === "true",
      comment: user.comment || ""
    }));
  },
  async setHotspotUser(router, id, patch) {
    const client = await this.connect(router);
    await client.menu("/ip/hotspot/user").update({
      disabled: patch.disabled ? "yes" : "no"
    }, id);
    await client.close();
    return { ok: true };
  },
  async createHotspotUsers(router, vouchers) {
    const client = await this.connect(router);
    for (const voucher of vouchers) {
      await client.menu("/ip/hotspot/user").add({
        server: voucher.server,
        name: voucher.username,
        password: voucher.password,
        profile: voucher.profile,
        "limit-uptime": voucher.limitUptime,
        "limit-bytes-total": String(voucher.limitBytesTotal || 0),
        comment: voucher.comment
      });
    }
    await client.close();
    return { ok: true };
  }
};
