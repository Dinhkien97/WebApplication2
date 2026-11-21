import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

/** Tổng hợp tick CPU của từng lõi: { idle, total }. */
export function cpuTimes() {
  return os.cpus().map(({ times: t }) => ({
    idle: t.idle,
    total: t.user + t.nice + t.sys + t.idle + t.irq,
  }));
}

/** % sử dụng của từng lõi giữa hai lần đo. */
export function cpuPercents(prev, curr) {
  return curr.map((c, i) => {
    const dTotal = c.total - (prev[i]?.total ?? 0);
    const dIdle = c.idle - (prev[i]?.idle ?? 0);
    return dTotal > 0 ? Math.round((1 - dIdle / dTotal) * 1000) / 10 : 0;
  });
}

async function disk() {
  try {
    const s = await fs.promises.statfs(path.parse(process.cwd()).root);
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    return { total, used: total - free };
  } catch {
    return null;
  }
}

export function createCollector() {
  let prev = cpuTimes();
  return async function collect() {
    const curr = cpuTimes();
    const cores = cpuPercents(prev, curr);
    prev = curr;
    const total = os.totalmem();
    return {
      t: Date.now(),
      host: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      model: os.cpus()[0]?.model ?? 'unknown',
      uptime: os.uptime(),
      load: os.loadavg(), // luôn [0,0,0] trên Windows
      cpu: cores.length ? Math.round((cores.reduce((a, b) => a + b, 0) / cores.length) * 10) / 10 : 0,
      cores,
      mem: { total, used: total - os.freemem() },
      disk: await disk(),
    };
  };
}
