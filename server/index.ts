import { createServer } from "node:http";
import next from "next";
import "./routes/account";
import "./routes/items";
import "./routes/play";
import "./routes/social";
import { handleApi } from "./http";
import { handleUpgrade } from "./rooms";

const port = Number(process.env.PORT ?? 4517);
const hostname = process.env.HOST ?? "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";
const dataDir = process.env.DATA_DIR ?? "data";

const app = next({
  dev,
  hostname,
  port,
  // Turbopack is for local dev; production uses the webpack build from `next build`.
  turbopack: dev,
});
const handle = app.getRequestHandler();

function securityHeaders(res: import("node:http").ServerResponse) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

app.prepare().then(() => {
  const nextUpgrade = app.getUpgradeHandler();
  const server = createServer(async (req, res) => {
    securityHeaders(res);
    if (await handleApi(req, res)) return;
    await handle(req, res);
  });
  server.on("upgrade", (req, socket, head) => {
    if ((req.url ?? "").startsWith("/ws")) handleUpgrade(req, socket, head);
    else nextUpgrade(req, socket, head);
  });
  server.listen(port, hostname, () => {
    console.log(
      `> Blue Lock: Egoist Pitch ready on http://${hostname}:${port} (${dev ? "dev" : "production"}) DATA_DIR=${dataDir}`,
    );
  });
});
