import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { createTrafficSystem } from "shared";
import { createApiRouter } from "../src/routes.js";

function startTestServer() {
  const { engine, simulator } = createTrafficSystem();
  simulator.setAutoDispatch(false);
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter({ engine, simulator, loadRecentEvents: () => [] }));
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api`, engine, simulator });
    });
  });
}

test("GET /api/health responds ok", async () => {
  const { server, baseUrl } = await startTestServer();
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  server.close();
});

test("GET /api/network returns the 12-node grid", async () => {
  const { server, baseUrl } = await startTestServer();
  const res = await fetch(`${baseUrl}/network`);
  const body = await res.json();
  assert.equal(body.intersections.length, 12);
  server.close();
});

test("POST /api/dispatch creates a vehicle and GET /api/state reflects it", async () => {
  const { server, baseUrl } = await startTestServer();
  const dispatchRes = await fetch(`${baseUrl}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startId: "A1", endId: "D1" }),
  });
  assert.equal(dispatchRes.status, 201);
  const vehicle = await dispatchRes.json();
  assert.equal(vehicle.route[0], "A1");

  const stateRes = await fetch(`${baseUrl}/state`);
  const state = await stateRes.json();
  assert.equal(state.vehicles.length, 1);
  server.close();
});

test("POST /api/dispatch rejects an unknown intersection id", async () => {
  const { server, baseUrl } = await startTestServer();
  const res = await fetch(`${baseUrl}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startId: "Z9", endId: "D1" }),
  });
  assert.equal(res.status, 400);
  server.close();
});

test("POST /api/telemetry requires vehicleId/lat/lng", async () => {
  const { server, baseUrl } = await startTestServer();
  const res = await fetch(`${baseUrl}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleId: "ext-1" }),
  });
  assert.equal(res.status, 400);
  server.close();
});
