export { TrafficEngine } from "./TrafficEngine.js";
export { DeviceSimulator } from "./DeviceSimulator.js";
export { buildNetwork, findRoute, getAxisBetween, listIntersectionIds } from "./network.js";
export { REGIONS, DEFAULT_REGION_ID, getRegion, listRegions } from "./regions.js";
export { distanceMeters, lerpPoint } from "./geo.js";
export * as constants from "./constants.js";

import { TrafficEngine } from "./TrafficEngine.js";
import { DeviceSimulator } from "./DeviceSimulator.js";
import { buildNetwork } from "./network.js";

// Convenience factory: wires up one engine + one simulator over a fresh
// network for the given region (defaults to "chennai" for zero-config
// compatibility). Used identically by the Node server and the browser-only
// demo runtime so both share the exact same traffic-control logic, anywhere
// on the globe the region catalog covers.
export function createTrafficSystem(regionId) {
  const network = buildNetwork(regionId);
  const engine = new TrafficEngine(network);
  const simulator = new DeviceSimulator(engine, network);
  return { network, engine, simulator };
}
