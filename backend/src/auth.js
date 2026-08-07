// Gates write endpoints behind a shared API key in production. Only
// enforced when TRAFFIC_API_KEY is actually set, so local dev and the
// zero-config demo stay frictionless - a real deployment is expected to set
// it (see .env.example) so an anonymous internet client can't dispatch
// vehicles, recall them, or inject fake telemetry into a live signal
// controller.
export function requireApiKey(req, res, next) {
  const expected = process.env.TRAFFIC_API_KEY;
  if (!expected) return next();

  const provided = req.get("x-api-key");
  if (provided !== expected) {
    return res.status(401).json({ error: "Missing or invalid API key" });
  }
  next();
}
