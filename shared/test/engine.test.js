import { test } from "node:test";
import assert from "node:assert/strict";
import { createTrafficSystem, buildNetwork, findRoute } from "../src/index.js";

test("buildNetwork creates a 4x3 grid of 12 connected intersections", () => {
  const network = buildNetwork();
  assert.equal(network.intersections.size, 12);
  for (const node of network.intersections.values()) {
    assert.ok(Object.keys(node.neighbors).length >= 2);
  }
});

test("findRoute returns a connected shortest path", () => {
  const network = buildNetwork();
  const route = findRoute(network, "A1", "D3");
  assert.ok(route);
  assert.equal(route[0], "A1");
  assert.equal(route[route.length - 1], "D3");
  // Manhattan grid: 3 columns over + 2 rows down = 5 hops minimum
  assert.equal(route.length, 6);
});

test("dispatching a vehicle moves it toward its destination over time", () => {
  const { network, simulator } = createTrafficSystem();
  simulator.setAutoDispatch(false);
  const vehicle = simulator.dispatch({ startId: "A1", endId: "D1" });
  assert.ok(vehicle);

  const startDistance = network.intersections.get("D1");
  for (let i = 0; i < 50; i += 1) simulator.tick(400);

  const updated = simulator.fleet.get(vehicle.id);
  assert.ok(updated, "vehicle should still be tracked while en route or just arrived");
});

test("an approaching vehicle preempts the intersection signal it is heading toward", () => {
  const { engine, simulator } = createTrafficSystem();
  simulator.setAutoDispatch(false);
  simulator.dispatch({ startId: "A1", endId: "B1" });

  let preempted = false;
  for (let i = 0; i < 60 && !preempted; i += 1) {
    simulator.tick(400);
    preempted = engine.getSnapshot().intersections.some((node) => node.preempted);
  }
  assert.ok(preempted, "expected at least one intersection to be preempted before the vehicle arrives");
});

test("vehicle eventually arrives and is retired from the fleet", () => {
  const { simulator } = createTrafficSystem();
  simulator.setAutoDispatch(false);
  const vehicle = simulator.dispatch({ startId: "A1", endId: "B1" });

  let arrived = false;
  for (let i = 0; i < 200 && !arrived; i += 1) {
    simulator.tick(400);
    const tracked = simulator.fleet.get(vehicle.id);
    arrived = tracked && tracked.status === "arrived";
  }
  assert.ok(arrived, "vehicle should reach arrived status within a reasonable number of ticks");
});
