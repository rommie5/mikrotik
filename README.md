# Xenfi Online Hotspot Manager

This is a React + Node rebuild scaffold for the existing PHP Mikhmon system.
It keeps the old project untouched and starts a new online-ready app in `xenfi-online`.

## What is included

- React dashboard for routers, active users, voucher generation, and remote access links.
- Node API with a clean RouterOS service boundary.
- Mock RouterOS mode for UI development without connecting to a real MikroTik.
- Voucher batch generation with printable voucher cards.
- Remote Winbox launch metadata. Real remote Winbox access still needs VPN, public routed IP, ZeroTier/Tailscale, or a TCP gateway.

## Run locally

```bash
cd xenfi-online
npm install
npm run dev
```

The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4080`.

On this Windows machine, PowerShell blocks `npm.ps1`. Use one of these:

```powershell
cmd /c npm install
cmd /c npm run dev
```

## Live RouterOS mode

Set `ROUTEROS_MODE=live` in `.env` and add routers from the UI. The backend is where RouterOS credentials belong; never connect directly from React.

Required MikroTik services:

- API enabled on port `8728` or API SSL on `8729`
- Winbox enabled on `8291` if you want remote Winbox launch links
- A reachable route from the server to each router, usually VPN/tunnel for online deployments
