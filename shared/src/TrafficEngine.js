import { EventBus } from "./EventBus.js";
import { distanceMeters } from "./geo.js";
import { getAxisBetween } from "./network.js";
import {
  DETECTION_RADIUS_M,
  EARLY_WARNING_RADIUS_M,
  ACOUSTIC_RANGE_M,
  SIREN_CONFIDENCE_TRIGGER,
  GPS_CONFIDENCE_TRIGGER,
  NS_GREEN_MS,
  EW_GREEN_MS,
  CLEARANCE_DELAY_MS,
  MAX_EVENT_LOG,
} from "./constants.js";

let eventSeq = 0;

/**
 * Reactive traffic-control backend. Knows nothing about *how* vehicle
 * positions arrive (simulated or real hardware) - it only reacts to
 * ingestTelemetry() calls, exactly like a real V2I preemption controller
 * reacting to roadside GPS/acoustic detector units.
 */
export class TrafficEngine {
  constructor(network) {
    this.network = network;
    this.bus = new EventBus();
    this.events = [];
    this.vehicles = new Map();
    this.stats = {
      totalDispatches: 0,
      totalPreemptions: 0,
      leadTimesMs: [],
    };

    this.intersections = new Map();
    for (const node of network.intersections.values()) {
      const axis = Math.random() < 0.5 ? "NS" : "EW";
      this.intersections.set(node.id, {
        id: node.id,
        name: node.name,
        lat: node.lat,
        lng: node.lng,
        axis,
        phaseRemainingMs: Math.random() * (axis === "NS" ? NS_GREEN_MS : EW_GREEN_MS),
        preempted: false,
        preemptedAxis: null,
        preemptedBy: null,
        preparing: null,
        clearanceMs: 0,
      });
    }
  }

  on(event, handler) {
    return this.bus.on(event, handler);
  }

  logEvent(type, message, severity = "info", meta = {}) {
    const entry = {
      id: `e${eventSeq += 1}`,
      ts: Date.now(),
      type,
      message,
      severity,
      meta,
    };
    this.events.push(entry);
    if (this.events.length > MAX_EVENT_LOG) this.events.shift();
    this.bus.emit("log", entry);
    return entry;
  }

  // Advance normal signal-phase cycling for intersections that are not
  // currently preempted or in their post-preemption clearance window.
  tick(dtMs) {
    for (const intersection of this.intersections.values()) {
      if (intersection.clearanceMs > 0) {
        intersection.clearanceMs -= dtMs;
        if (intersection.clearanceMs <= 0) {
          intersection.clearanceMs = 0;
          intersection.preempted = false;
          intersection.preemptedAxis = null;
          intersection.preemptedBy = null;
          intersection.phaseRemainingMs = intersection.axis === "NS" ? NS_GREEN_MS : EW_GREEN_MS;
        }
        continue;
      }
      if (intersection.preempted) continue;

      intersection.phaseRemainingMs -= dtMs;
      if (intersection.phaseRemainingMs <= 0) {
        intersection.axis = intersection.axis === "NS" ? "EW" : "NS";
        intersection.phaseRemainingMs = intersection.axis === "NS" ? NS_GREEN_MS : EW_GREEN_MS;
      }
    }
  }

  registerDispatch() {
    this.stats.totalDispatches += 1;
  }

  /**
   * Telemetry payload mirrors what a real onboard unit (GPS receiver +
   * acoustic siren classifier) would transmit to the roadside controller.
   */
  ingestTelemetry(payload) {
    const {
      vehicleId,
      label,
      lat,
      lng,
      speed,
      status,
      targetIntersectionId,
      approachAxis,
      gpsConfidence,
      sirenConfidence,
    } = payload;

    const vehicle = {
      id: vehicleId,
      label,
      lat,
      lng,
      speed,
      status,
      targetIntersectionId,
      approachAxis,
      gpsConfidence,
      sirenConfidence,
      detectionSource: null,
      updatedAt: Date.now(),
    };
    const previous = this.vehicles.get(vehicleId);
    this.vehicles.set(vehicleId, vehicle);

    if (!targetIntersectionId || status !== "en-route") return;
    const intersection = this.intersections.get(targetIntersectionId);
    if (!intersection) return;

    const distance = distanceMeters({ lat, lng }, { lat: intersection.lat, lng: intersection.lng });
    const gpsTrigger = distance <= DETECTION_RADIUS_M && gpsConfidence >= GPS_CONFIDENCE_TRIGGER;
    const sirenTrigger = distance <= ACOUSTIC_RANGE_M && sirenConfidence >= SIREN_CONFIDENCE_TRIGGER;
    const shouldPreempt = gpsTrigger || sirenTrigger;

    if (shouldPreempt) {
      const source = gpsTrigger && sirenTrigger ? "GPS + siren" : gpsTrigger ? "GPS" : "siren";
      vehicle.detectionSource = source;

      if (!intersection.preempted) {
        intersection.preempted = true;
        intersection.preemptedAxis = approachAxis;
        intersection.preemptedBy = vehicleId;
        intersection.axis = approachAxis;
        intersection.clearanceMs = 0;
        intersection.preparing = null;
        this.stats.totalPreemptions += 1;
        const leadTimeMs = (distance / Math.max(speed, 1)) * 1000;
        this.stats.leadTimesMs.push(leadTimeMs);
        if (this.stats.leadTimesMs.length > 50) this.stats.leadTimesMs.shift();
        this.logEvent(
          "preemption",
          `${label} detected ${Math.round(distance)}m out via ${source} - green corridor opened at ${intersection.name}`,
          "alert",
          { vehicleId, intersectionId: intersection.id },
        );
      } else if (intersection.preemptedBy !== vehicleId && intersection.preemptedAxis !== approachAxis) {
        this.logEvent(
          "conflict",
          `${label} approaching ${intersection.name} while corridor already held for another unit - holding priority for first responder in the intersection`,
          "warning",
          { vehicleId, intersectionId: intersection.id },
        );
      }
    } else if (distance <= EARLY_WARNING_RADIUS_M && !intersection.preempted) {
      intersection.preparing = vehicleId;
    } else if (previous?.targetIntersectionId !== targetIntersectionId) {
      intersection.preparing = null;
    }
  }

  // Called by the fleet simulator when a vehicle clears an intersection
  // (or is recalled/arrives) so the signal can resume normal cycling.
  releaseIntersection(intersectionId, vehicleId, reason = "cleared") {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection || intersection.preemptedBy !== vehicleId) return;
    intersection.preparing = null;
    intersection.clearanceMs = CLEARANCE_DELAY_MS;
    this.logEvent(
      "clear",
      `Corridor ${reason} at ${intersection.name} - signal resuming normal cycle`,
      "info",
      { vehicleId, intersectionId },
    );
  }

  removeVehicle(vehicleId) {
    this.vehicles.delete(vehicleId);
  }

  getAxisBetween(fromId, toId) {
    return getAxisBetween(this.network, fromId, toId);
  }

  // Per-tick payload intentionally carries only fields that change tick to
  // tick (id + dynamic signal state). Static fields (name/lat/lng) live in
  // the one-time network payload (GET /api/network or getNetwork()) so a
  // 400ms broadcast to every connected dashboard doesn't resend immutable
  // data - this matters once a region has hundreds of intersections.
  getSnapshot() {
    return {
      timestamp: Date.now(),
      regionId: this.network.regionId,
      cityName: this.network.cityName,
      intersections: Array.from(this.intersections.values()).map((i) => ({
        id: i.id,
        axis: i.axis,
        phaseRemainingMs: Math.max(0, Math.round(i.phaseRemainingMs)),
        preempted: i.preempted,
        preemptedAxis: i.preemptedAxis,
        preemptedBy: i.preemptedBy,
        preparing: i.preparing,
        clearanceMs: Math.max(0, Math.round(i.clearanceMs)),
      })),
      vehicles: Array.from(this.vehicles.values()),
      stats: {
        activeVehicles: Array.from(this.vehicles.values()).filter((v) => v.status === "en-route").length,
        preemptedIntersections: Array.from(this.intersections.values()).filter((i) => i.preempted).length,
        totalDispatches: this.stats.totalDispatches,
        totalPreemptions: this.stats.totalPreemptions,
        avgLeadTimeSeconds: this.stats.leadTimesMs.length
          ? Math.round((this.stats.leadTimesMs.reduce((a, b) => a + b, 0) / this.stats.leadTimesMs.length) / 100) / 10
          : null,
      },
    };
  }

  getEvents(limit = 50) {
    return this.events.slice(-limit).reverse();
  }
}
