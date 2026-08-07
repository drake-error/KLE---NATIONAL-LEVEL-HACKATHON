import { distanceMeters, lerpPoint } from "./geo.js";
import { findRoute, listIntersectionIds } from "./network.js";
import { DEFAULT_VEHICLE_SPEED_MPS, AUTO_DISPATCH_MIN_MS, AUTO_DISPATCH_MAX_MS } from "./constants.js";

let vehicleSeq = 0;
const CALL_SIGNS = ["Medic", "Rescue", "Ambulance", "Lifeline"];

/**
 * Stands in for the fleet of real IoT devices: an onboard GPS unit plus an
 * acoustic siren classifier in each ambulance. In production this class is
 * replaced by real hardware POSTing telemetry to the same
 * `engine.ingestTelemetry` contract over /api/telemetry - the TrafficEngine
 * does not know or care that this one is simulated.
 */
export class DeviceSimulator {
  constructor(engine, network) {
    this.engine = engine;
    this.network = network;
    this.fleet = new Map();
    this.autoDispatchEnabled = true;
    this.autoDispatchTimerMs = randomInterval();
  }

  dispatch({ startId, endId, label } = {}) {
    const ids = listIntersectionIds(this.network);
    const start = startId && this.network.intersections.has(startId) ? startId : randomChoice(ids);
    const end = endId && this.network.intersections.has(endId) && endId !== start
      ? endId
      : randomChoice(ids.filter((id) => id !== start));

    const route = findRoute(this.network, start, end);
    if (!route || route.length < 2) return null;

    vehicleSeq += 1;
    const id = `v${vehicleSeq}`;
    const callSign = label || `${randomChoice(CALL_SIGNS)} ${vehicleSeq}`;
    const startNode = this.network.intersections.get(start);
    const endNode = this.network.intersections.get(end);

    const vehicle = {
      id,
      label: callSign,
      route,
      routeIndex: 1,
      lat: startNode.lat,
      lng: startNode.lng,
      speed: DEFAULT_VEHICLE_SPEED_MPS * (0.85 + Math.random() * 0.3),
      status: "en-route",
      gpsConfidence: 0.95,
      sirenConfidence: 0.1,
      arrivedAtMs: null,
      _retireScheduled: false,
    };
    this.fleet.set(id, vehicle);
    this.engine.registerDispatch();
    this.engine.logEvent(
      "dispatch",
      `${callSign} dispatched: ${startNode.name} -> ${endNode.name} (${route.length - 1} block${route.length - 1 === 1 ? "" : "s"})`,
      "info",
      { vehicleId: id },
    );
    this._publish(vehicle);
    return vehicle;
  }

  recall(vehicleId) {
    const vehicle = this.fleet.get(vehicleId);
    if (!vehicle) return;
    this.engine.logEvent("recall", `${vehicle.label} recalled before arrival`, "info", { vehicleId });
    this._retire(vehicle, "recalled");
  }

  setAutoDispatch(enabled) {
    this.autoDispatchEnabled = enabled;
  }

  tick(dtMs) {
    this.engine.tick(dtMs);

    if (this.autoDispatchEnabled) {
      this.autoDispatchTimerMs -= dtMs;
      if (this.autoDispatchTimerMs <= 0) {
        this.autoDispatchTimerMs = randomInterval();
        if (this.fleet.size < 4) this.dispatch();
      }
    }

    for (const vehicle of Array.from(this.fleet.values())) {
      if (vehicle.status !== "en-route") continue;
      this._advance(vehicle, dtMs);
    }
  }

  _advance(vehicle, dtMs) {
    const network = this.network;
    let stepMeters = vehicle.speed * (dtMs / 1000);

    while (stepMeters > 0 && vehicle.status === "en-route") {
      const targetId = vehicle.route[vehicle.routeIndex];
      const target = network.intersections.get(targetId);
      const fromId = vehicle.route[vehicle.routeIndex - 1];
      const from = network.intersections.get(fromId);
      const distanceToTarget = distanceMeters({ lat: vehicle.lat, lng: vehicle.lng }, target);

      if (stepMeters >= distanceToTarget) {
        vehicle.lat = target.lat;
        vehicle.lng = target.lng;
        stepMeters -= distanceToTarget;
        this.engine.releaseIntersection(targetId, vehicle.id, "passed");
        vehicle.routeIndex += 1;

        if (vehicle.routeIndex >= vehicle.route.length) {
          vehicle.status = "arrived";
          vehicle.arrivedAtMs = Date.now();
          this.engine.logEvent("arrival", `${vehicle.label} arrived on scene at ${target.name}`, "success", {
            vehicleId: vehicle.id,
          });
          break;
        }
      } else {
        const segmentLength = distanceMeters(from, target) || 1;
        const traveled = segmentLength - distanceToTarget + stepMeters;
        const t = Math.max(0, Math.min(1, traveled / segmentLength));
        const point = lerpPoint(from, target, t);
        vehicle.lat = point.lat;
        vehicle.lng = point.lng;
        stepMeters = 0;
      }
    }

    this._updateSensors(vehicle);
    this._publish(vehicle);
  }

  _updateSensors(vehicle) {
    if (vehicle.status !== "en-route") return;
    const targetId = vehicle.route[vehicle.routeIndex];
    const target = this.network.intersections.get(targetId);
    const distanceToTarget = distanceMeters({ lat: vehicle.lat, lng: vehicle.lng }, target);

    // Acoustic siren detection is short-range and noisier than GPS, like a
    // real microphone-array classifier picking up ambient traffic noise.
    vehicle.sirenConfidence = distanceToTarget < 280
      ? Math.min(0.97, 0.55 + (280 - distanceToTarget) / 280 + (Math.random() * 0.1 - 0.05))
      : Math.max(0, 0.15 + Math.random() * 0.1);
    // Occasional simulated GPS dropout (urban canyon effect) to demonstrate
    // the system still has the siren channel as a fallback.
    vehicle.gpsConfidence = Math.random() < 0.03 ? 0.4 + Math.random() * 0.2 : 0.92 + Math.random() * 0.08;
  }

  _publish(vehicle) {
    const targetId = vehicle.status === "en-route" ? vehicle.route[vehicle.routeIndex] : null;
    const fromId = vehicle.route[vehicle.routeIndex - 1] ?? vehicle.route[0];
    const approachAxis = targetId ? this.engine.getAxisBetween(fromId, targetId) : null;

    this.engine.ingestTelemetry({
      vehicleId: vehicle.id,
      label: vehicle.label,
      lat: vehicle.lat,
      lng: vehicle.lng,
      speed: vehicle.speed,
      status: vehicle.status,
      targetIntersectionId: targetId,
      approachAxis,
      gpsConfidence: vehicle.gpsConfidence,
      sirenConfidence: vehicle.sirenConfidence,
    });

    if (vehicle.status === "arrived" && !vehicle._retireScheduled) {
      vehicle._retireScheduled = true;
      setTimeoutSafe(() => this._retire(vehicle, "arrived"), 4000);
    }
  }

  _retire(vehicle, reason) {
    if (!this.fleet.has(vehicle.id)) return;
    const targetId = vehicle.route[vehicle.routeIndex];
    if (targetId) this.engine.releaseIntersection(targetId, vehicle.id, reason);
    this.fleet.delete(vehicle.id);
    this.engine.removeVehicle(vehicle.id);
  }
}

function randomInterval() {
  return AUTO_DISPATCH_MIN_MS + Math.random() * (AUTO_DISPATCH_MAX_MS - AUTO_DISPATCH_MIN_MS);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setTimeoutSafe(fn, ms) {
  if (typeof setTimeout === "function") setTimeout(fn, ms);
  else fn();
}
