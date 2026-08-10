import { Router } from "express";
import rateLimit from "express-rate-limit";
import { listIntersectionIds, listRegions } from "shared";
import { requireApiKey } from "./auth.js";

// Real-hardware-facing and signal-affecting endpoints get a tighter limit
// than the read-only dashboard polling endpoints (those are covered by the
// global limiter applied in server.js).
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests - slow down" },
});

export function createApiRouter({ engine, simulator, loadRecentEvents }) {
  const router = Router();

  router.get("/health", (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  router.get("/regions", (req, res) => {
    res.json({ activeRegionId: engine.network.regionId, regions: listRegions() });
  });

  router.get("/network", (req, res) => {
    res.json({
      regionId: engine.network.regionId,
      cityName: engine.network.cityName,
      intersections: Array.from(engine.network.intersections.values()).map((node) => ({
        id: node.id,
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        col: node.col,
        row: node.row,
        neighbors: node.neighbors,
      })),
    });
  });

  router.get("/state", (req, res) => {
    res.json(engine.getSnapshot());
  });

  router.get("/events", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 300);
    res.json(engine.getEvents(limit));
  });

  router.get("/history", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json(loadRecentEvents(limit));
  });

  router.post("/dispatch", writeLimiter, requireApiKey, (req, res) => {
    const { startId, endId, label } = req.body ?? {};
    const ids = listIntersectionIds(engine.network);
    if (startId && !ids.includes(startId)) {
      return res.status(400).json({ error: `Unknown startId: ${startId}` });
    }
    if (endId && !ids.includes(endId)) {
      return res.status(400).json({ error: `Unknown endId: ${endId}` });
    }

    const vehicle = simulator.dispatch({ startId, endId, label });
    if (!vehicle) return res.status(400).json({ error: "Unable to compute a route for that dispatch" });
    res.status(201).json(vehicle);
  });

  router.post("/recall/:id", writeLimiter, requireApiKey, (req, res) => {
    simulator.recall(req.params.id);
    res.json({ ok: true });
  });

  router.post("/auto-dispatch", writeLimiter, requireApiKey, (req, res) => {
    const { enabled } = req.body ?? {};
    simulator.setAutoDispatch(Boolean(enabled));
    res.json({ ok: true, enabled: Boolean(enabled) });
  });

  // Ingestion contract for real (or hand-curled) IoT telemetry - this is the
  // same shape real onboard GPS/siren hardware would POST in production.
  router.post("/telemetry", writeLimiter, requireApiKey, (req, res) => {
    const payload = req.body ?? {};
    if (!payload.vehicleId || typeof payload.lat !== "number" || typeof payload.lng !== "number") {
      return res.status(400).json({ error: "vehicleId, lat, lng are required" });
    }
    engine.ingestTelemetry(payload);
    res.json({ ok: true });
  });

  return router;
}
