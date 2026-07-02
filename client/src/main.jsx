import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BadgeDollarSign,
  Cable,
  CirclePower,
  KeyRound,
  MonitorCog,
  Plus,
  Printer,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  UserRoundCog,
  Wifi
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function App() {
  const [routers, setRouters] = useState([]);
  const [selectedRouterId, setSelectedRouterId] = useState("");
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [remote, setRemote] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [routerMessage, setRouterMessage] = useState(null);
  const [scripts, setScripts] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");

  const selectedRouter = routers.find((router) => router.id === selectedRouterId) || routers[0] || null;
  const filteredUsers = useMemo(() => {
    return users.filter((user) => `${user.name} ${user.profile} ${user.comment}`.toLowerCase().includes(query.toLowerCase()));
  }, [users, query]);

  async function loadRouters(preferredRouterId = selectedRouterId) {
    const data = await api("/api/routers");
    setRouters(data.routers);
    if (!data.routers.length) {
      setSelectedRouterId("");
      setSummary(null);
      setUsers([]);
      setRemote(null);
      return;
    }

    const nextRouterId = data.routers.some((router) => router.id === preferredRouterId)
      ? preferredRouterId
      : data.routers[0].id;
    setSelectedRouterId(nextRouterId);
  }

  async function refresh(routerId = selectedRouterId) {
    if (!routerId) {
      setSummary(null);
      setUsers([]);
      setRemote(null);
      return;
    }

    setLoading(true);
    try {
      const [summaryData, userData, remoteData] = await Promise.all([
        api(`/api/routers/${routerId}/summary`),
        api(`/api/routers/${routerId}/hotspot-users`),
        api(`/api/routers/${routerId}/remote-access`)
      ]);
      setSummary(summaryData);
      setUsers(userData.users);
      setRemote(remoteData);
    } catch (error) {
      setRouterMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRouters();
  }, []);

  useEffect(() => {
    refresh(selectedRouterId);
  }, [selectedRouterId]);

  async function testConnection() {
    if (!selectedRouter) {
      setRouterMessage({ type: "error", text: "Add a router before testing the connection." });
      return;
    }

    const result = await api(`/api/routers/${selectedRouter.id}/test`, { method: "POST" });
    await loadRouters(selectedRouter.id);
    setRouterMessage({ type: result.connected ? "success" : "error", text: result.connected ? `Connected to ${result.identity}` : "Connection failed" });
  }

  async function toggleUser(user) {
    if (!selectedRouter) return;
    await api(`/api/routers/${selectedRouter.id}/hotspot-users/${encodeURIComponent(user.id)}`, {
      method: "PATCH",
      body: { disabled: !user.disabled }
    });
    await refresh(selectedRouter.id);
  }

  async function createRouter(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      setRouterMessage({ type: "error", text: "The router form is unavailable." });
      return;
    }

    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const data = await api("/api/routers", {
        method: "POST",
        body
      });
      setRouterMessage({ type: "success", text: `${data.router.name} added successfully.` });
      await loadRouters(data.router.id);
      form.reset();
      setActivePage("dashboard");
    } catch (error) {
      setRouterMessage({ type: "error", text: error.message });
    }
  }

  async function createVouchers(event) {
    event.preventDefault();
    if (!selectedRouter) {
      setRouterMessage({ type: "error", text: "Select a router before generating vouchers." });
      return;
    }

    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const body = Object.fromEntries(new FormData(form).entries());
    const data = await api(`/api/routers/${selectedRouter.id}/vouchers`, {
      method: "POST",
      body
    });
    setVouchers(data.vouchers);
    setRouterMessage({ type: "success", text: `${data.vouchers.length} vouchers generated.` });
    await refresh(selectedRouter.id);
  }

  async function generateScripts(type = "full") {
    const routerId = selectedRouterId || routers[0]?.id;
    if (!routerId) {
      setRouterMessage({ type: "error", text: "Add a router before generating scripts." });
      return;
    }

    try {
      const data = await api(`/api/routers/${routerId}/scripts`, {
        method: "POST",
        body: { type }
      });
      setScripts(data.scripts);
      setRouterMessage({ type: "success", text: `Generated ${type} RouterOS scripts for router ${routerId}.` });
      setActivePage("scripts");
    } catch (error) {
      setRouterMessage({ type: "error", text: error.message });
    }
  }

  async function copyScripts() {
    if (!scripts) {
      setRouterMessage({ type: "error", text: "Generate scripts first." });
      return;
    }

    const text = [scripts.summary, scripts.management, scripts.hotspot, scripts.vpn].join("\n\n");
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setRouterMessage({ type: "success", text: "Scripts copied to clipboard." });
      return;
    }

    setRouterMessage({ type: "error", text: "Clipboard access is unavailable in this browser." });
  }

  function renderNavButton(page, label, icon) {
    const Icon = icon;
    return (
      <button
        key={page}
        type="button"
        className={`nav-link ${activePage === page ? "active" : ""}`}
        onClick={() => setActivePage(page)}
      >
        <Icon size={18} /> {label}
      </button>
    );
  }

  function renderContent() {
    if (activePage === "routers") {
      return (
        <section className="grid">
          <form id="router-setup" className="panel" onSubmit={createRouter}>
            <div className="panel-title">
              <div>
                <h2>Router Setup</h2>
                <p>Add a router and keep credentials on the server.</p>
              </div>
              <Plus size={22} />
            </div>
            <div className="form-grid">
              <label>Name<input name="name" placeholder="Router name" /></label>
              <label>Host<input name="host" placeholder="192.168.1.1" /></label>
              <label>API port<input name="apiPort" type="number" placeholder="8728" /></label>
              <label>Winbox port<input name="winboxPort" type="number" placeholder="8291" /></label>
              <label>Username<input name="username" placeholder="admin" /></label>
              <label>Password<input name="password" type="password" placeholder="Password" /></label>
              <label>Hotspot name<input name="hotspotName" placeholder="Hotspot name" /></label>
              <label>DNS name<input name="dnsName" placeholder="login.wifi" /></label>
              <label>Currency<input name="currency" placeholder="UGX" /></label>
            </div>
            <button type="submit"><Plus size={17} /> Add router</button>
            {routerMessage ? <p className={`message ${routerMessage.type}`}>{routerMessage.text}</p> : null}
          </form>

          <div className="panel">
            <div className="panel-title">
              <div>
                <h2>Configured routers</h2>
                <p>Switch between routers and manage them from one place.</p>
              </div>
              <Cable size={22} />
            </div>
            {routers.length ? (
              <div className="router-list">
                {routers.map((router) => (
                  <button type="button" key={router.id} className={`router-card ${router.id === selectedRouter?.id ? "active" : ""}`} onClick={() => setSelectedRouterId(router.id)}>
                    <strong>{router.name}</strong>
                    <span>{router.host}:{router.apiPort}</span>
                    <small className={`state ${router.status === "online" ? "on" : router.status === "offline" ? "off" : ""}`}>{router.status || "unknown"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p>No routers configured yet. Add one to start managing hotspot users.</p>
            )}
          </div>
        </section>
      );
    }

    if (activePage === "users") {
      return (
        <section className="grid">
          <div className="panel wide">
            <div className="panel-title">
              <div>
                <h2>Hotspot Users</h2>
                <p>Enable, disable, and search voucher users.</p>
              </div>
              <label className="search">
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
              </label>
            </div>
            <div className="table">
              <div className="row head"><span>User</span><span>Profile</span><span>Uptime</span><span>Status</span><span></span></div>
              {filteredUsers.map((user) => (
                <div className="row" key={user.id}>
                  <span>{user.name}<small>{user.comment}</small></span>
                  <span>{user.profile}</span>
                  <span>{user.uptime}</span>
                  <span className={user.disabled ? "state off" : "state on"}>{user.disabled ? "Disabled" : "Enabled"}</span>
                  <button className="icon-button" type="button" onClick={() => toggleUser(user)} title={user.disabled ? "Enable user" : "Disable user"}>
                    <CirclePower size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (activePage === "vouchers") {
      return (
        <section className="grid">
          <form className="panel" onSubmit={createVouchers}>
            <div className="panel-title">
              <div>
                <h2>Voucher Generator</h2>
                <p>Create RouterOS hotspot users in batches.</p>
              </div>
              <Ticket size={22} />
            </div>
            <label>Quantity<input name="quantity" type="number" min="1" max="500" placeholder="10" /></label>
            <label>Profile<input name="profile" placeholder="daily" /></label>
            <label>Prefix<input name="prefix" placeholder="FS" /></label>
            <label>Length<input name="length" type="number" min="3" max="12" placeholder="6" /></label>
            <label>Mode<select name="mode"><option value="voucher">Voucher code</option><option value="username-password">Username and password</option></select></label>
            <label>Charset<select name="charset"><option value="mix">Mixed readable</option><option value="upper">Uppercase</option><option value="lower">Lowercase</option><option value="num">Numbers</option></select></label>
            <label>Price<input name="price" type="number" min="0" placeholder="1000" /></label>
            <button type="submit"><Plus size={17} /> Generate vouchers</button>
            {routerMessage ? <p className={`message ${routerMessage.type}`}>{routerMessage.text}</p> : null}
          </form>

          <div className="panel wide print-area">
            <div className="panel-title">
              <div>
                <h2>Printable Vouchers</h2>
                <p>{vouchers.length ? `${vouchers.length} vouchers ready` : "Generated vouchers will appear here."}</p>
              </div>
              <button type="button" onClick={() => window.print()}><Printer size={17} /> Print</button>
            </div>
            <div className="vouchers">
              {vouchers.map((voucher) => <Voucher key={voucher.username} voucher={voucher} />)}
            </div>
          </div>
        </section>
      );
    }

    if (activePage === "scripts") {
      return (
        <section className="grid">
          <div className="panel wide">
            <div className="panel-title">
              <div>
                <h2>RouterOS Scripts</h2>
                <p>Generate hotspot, VPN, and remote-access scripts for your MikroTik.</p>
                <p className="note">{selectedRouter ? `Router: ${selectedRouter.name} (${selectedRouter.host})` : "No router selected. Choose one from the top bar."}</p>
              </div>
              <div className="toolbar">
                <button type="button" disabled={!routers.length} onClick={() => generateScripts("full")}>Generate full</button>
                <button type="button" disabled={!routers.length} onClick={() => generateScripts("minimal")}>Generate minimal</button>
                <button type="button" disabled={!scripts} onClick={copyScripts}>Copy</button>
              </div>
            </div>
            {routerMessage ? <p className={`message ${routerMessage.type}`}>{routerMessage.text}</p> : null}
            {scripts ? (
              <div className="script-block">
                <h3>Summary</h3>
                <pre>{scripts.summary}</pre>
                <h3>Management</h3>
                <pre>{scripts.management}</pre>
                <h3>Hotspot</h3>
                <pre>{scripts.hotspot}</pre>
                <h3>VPN</h3>
                <pre>{scripts.vpn}</pre>
              </div>
            ) : (
              <p>{routers.length ? "Click a generation button to create RouterOS scripts." : "Add a router first to generate scripts."}</p>
            )}
          </div>
        </section>
      );
    }

    if (activePage === "remote") {
      return (
        <section className="grid">
          <div className="panel">
            <div className="panel-title">
              <div>
                <h2>Remote Access</h2>
                <p>Winbox and WebFig launch targets.</p>
              </div>
              <ShieldCheck size={22} />
            </div>
            <a className="remote-link" href={remote?.webfig || "#"} target="_blank" rel="noreferrer"><MonitorCog size={18} /> Open WebFig</a>
            <a className="remote-link" href={remote?.winbox || "#"}><Cable size={18} /> Launch Winbox</a>
            <p className="note">{remote?.note}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="grid">
        <div className="panel wide">
          <div className="panel-title">
            <div>
              <h2>Dashboard</h2>
              <p>Live router summary and hotspot activity.</p>
            </div>
          </div>
          <section className="metrics">
            <Metric icon={Wifi} label="Active users" value={summary?.activeUsers ?? "-"} />
            <Metric icon={KeyRound} label="Total users" value={summary?.totalUsers ?? "-"} />
            <Metric icon={Activity} label="CPU load" value={`${summary?.cpuLoad ?? 0}%`} />
            <Metric icon={BadgeDollarSign} label="Traffic" value={`${summary?.downloadMbps ?? 0} / ${summary?.uploadMbps ?? 0} Mbps`} />
          </section>
          <p>{selectedRouter ? `${selectedRouter.name} · ${selectedRouter.host}` : "Add a router to start monitoring it."}</p>
        </div>
      </section>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <RadioTower size={28} />
          <div>
            <strong>Xenfi Online</strong>
            <span>Hotspot control</span>
          </div>
        </div>
        <nav>
          {renderNavButton("dashboard", "Dashboard", Activity)}
          {renderNavButton("routers", "Routers", Cable)}
          {renderNavButton("users", "Users", UserRoundCog)}
          {renderNavButton("vouchers", "Vouchers", Ticket)}
          {renderNavButton("scripts", "Scripts", MonitorCog)}
          {renderNavButton("remote", "Remote", ShieldCheck)}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{selectedRouter?.hotspotName || "Hotspot manager"}</h1>
            <p>{summary?.identity || "RouterOS dashboard"} · {selectedRouter?.host || "No router selected"}</p>
          </div>
          <div className="toolbar">
            <select value={selectedRouterId} onChange={(event) => setSelectedRouterId(event.target.value)}>
              <option value="">Select router</option>
              {routers.map((router) => <option key={router.id} value={router.id}>{router.name}</option>)}
            </select>
            <button type="button" onClick={testConnection}><Cable size={17} /> Test</button>
            <button type="button" onClick={() => refresh(selectedRouterId)}><RefreshCw size={17} className={loading ? "spin" : ""} /> Refresh</button>
          </div>
        </header>

        {renderContent()}
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Voucher({ voucher }) {
  return (
    <article className="voucher">
      <header>
        <strong>{voucher.hotspotName}</strong>
        <span>#{voucher.number}</span>
      </header>
      <div className="voucher-code">{voucher.username}</div>
      <dl>
        <div><dt>Password</dt><dd>{voucher.password}</dd></div>
        <div><dt>Profile</dt><dd>{voucher.profile}</dd></div>
        <div><dt>Price</dt><dd>{voucher.currency} {voucher.price.toLocaleString()}</dd></div>
      </dl>
      <footer>Open http://{voucher.dnsName}</footer>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
