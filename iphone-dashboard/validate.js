// Validates and normalizes sensor payloads coming from an untrusted client.
const num = (v, min, max) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;

export function sanitizeReading(raw) {
  if (typeof raw !== 'object' || raw === null) return null;
  const out = { t: Date.now() };
  if (raw.motion && typeof raw.motion === 'object') {
    const m = raw.motion;
    out.motion = {
      ax: num(m.ax, -200, 200), ay: num(m.ay, -200, 200), az: num(m.az, -200, 200),
      alpha: num(m.alpha, -720, 720), beta: num(m.beta, -720, 720), gamma: num(m.gamma, -720, 720),
      heading: num(m.heading, 0, 360),
    };
  }
  if (raw.geo && typeof raw.geo === 'object') {
    const g = raw.geo;
    const lat = num(g.lat, -90, 90), lon = num(g.lon, -180, 180);
    if (lat !== null && lon !== null) {
      out.geo = { lat, lon, acc: num(g.acc, 0, 1e6), speed: num(g.speed, 0, 1e4), alt: num(g.alt, -1e4, 1e5) };
    }
  }
  if (raw.net && typeof raw.net === 'object') {
    out.net = {
      online: raw.net.online === true,
      type: typeof raw.net.type === 'string' ? raw.net.type.slice(0, 16) : null,
      downlink: num(raw.net.downlink, 0, 1e5),
    };
  }
  return out.motion || out.geo || out.net ? out : null;
}
