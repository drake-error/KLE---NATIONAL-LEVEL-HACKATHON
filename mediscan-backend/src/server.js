import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Server as SocketIOServer } from "socket.io";
import { createTrafficSystem, constants } from "shared";
import { createApiRouter } from "./routes.js";
import { persistEvent, loadRecentEvents } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

// Defaults to wide open ("*") for zero-config demo/eval convenience; a real
// production deployment should set CORS_ORIGIN to a comma-separated
// allowlist of the actual dashboard origin(s) it serves.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

// A real deployment manages one region per running controller instance
// (this mirrors how municipal traffic-management systems are actually
// deployed - one region's worth of intersections, not a global multiplexer)
// so the active region is chosen once at boot via env var.
const { engine, simulator } = createTrafficSystem(process.env.REGION_ID);

engine.on("log", (entry) => {
  try {
    persistEvent(entry);
  } catch (err) {
    console.error("Failed to persist event:", err.message);
  }
});

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Leaflet's tile layer (MapView.jsx) fetches raster tiles from
        // CARTO's basemap CDN; everything else (the built SPA, the API,
        // the websocket) is same-origin.
        "img-src": ["'self'", "data:", "https://*.basemaps.cartocdn.com"],
        "connect-src": ["'self'"],
      },
    },
  }),
);
app.use(compression());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(
  "/api",
  rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }),
  createApiRouter({ engine, simulator, loadRecentEvents }),
);

// Optional single-process deployment: if the client has been built, serve
// it directly so the whole app can ship as one web service.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
  console.log("Serving prebuilt client from", clientDist);
}

const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: allowedOrigins } });

io.on("connection", (socket) => {
  socket.emit("state", engine.getSnapshot());
  socket.emit("events", engine.getEvents(50));
});

engine.on("log", (entry) => {
  io.emit("event", entry);
});

const tickInterval = setInterval(() => {
  simulator.tick(constants.TICK_MS);
  io.emit("state", engine.getSnapshot());
}, constants.TICK_MS);

process.on("SIGTERM", () => {
  clearInterval(tickInterval);
  server.close(() => process.exit(0));
});

server.listen(PORT, () => {
  console.log(`Smart traffic control server listening on port ${PORT}`);
});
