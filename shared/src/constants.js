// Tunable parameters for the detection + preemption model.
// Distances are in meters, durations in milliseconds.
export const DETECTION_RADIUS_M = 350; // GPS-based preemption trigger range
export const EARLY_WARNING_RADIUS_M = 750; // "vehicle inbound" UI cue range
export const ACOUSTIC_RANGE_M = 250; // simulated siren detection range
export const PASS_THRESHOLD_M = 35; // considered "through" the intersection
export const CLEARANCE_DELAY_MS = 2500; // all-red clearance before resuming normal cycle

export const SIREN_CONFIDENCE_TRIGGER = 0.75;
export const GPS_CONFIDENCE_TRIGGER = 0.6;

export const NS_GREEN_MS = 12000;
export const EW_GREEN_MS = 12000;
export const ALL_RED_MS = 1500;

export const DEFAULT_VEHICLE_SPEED_MPS = 14; // ~50 km/h cruising speed
export const TICK_MS = 400;

export const AUTO_DISPATCH_MIN_MS = 18000;
export const AUTO_DISPATCH_MAX_MS = 40000;

export const MAX_EVENT_LOG = 300;
