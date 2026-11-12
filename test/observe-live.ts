import { Client } from "colyseus.js";

const URL = process.argv[2] || "https://jingxin-temple.onrender.com";
const rooms = ["courtyard", "main_hall", "hall_guanyin", "hall_mile", "hall_yaoshi"];
const tag = "巡视" + Date.now().toString(36).slice(-5);

interface P { name: string; sitting: boolean; cushionId: number; x: number; z: number; }

async function inspect(name: string) {
  const c = new Client(URL);
  const r = await Promise.race([
    c.joinOrCreate(name, { name: tag + name.replace(/[^a-z]/g, "").slice(-4) }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("join timeout")), 12000)),
  ]);
  await new Promise((res) => setTimeout(res, 500));
  const players: unknown[] = [];
  r.state.players?.forEach((p: P, id: string) => {
    players.push({
      id,
      name: p.name,
      sitting: p.sitting,
      cushionId: p.cushionId,
      x: +Number(p.x).toFixed(2),
      z: +Number(p.z).toFixed(2),
      self: id === r.sessionId,
    });
  });
  const out = {
    room: name,
    hallId: r.state.hallId,
    playerCount: r.state.players?.size ?? players.length,
    players,
    incense: r.state.incenses?.size ?? 0,
    cushionsOccupied: r.state.cushions ? [...r.state.cushions].filter(Boolean).length : 0,
  };
  try { await r.leave(); } catch { /* ignore */ }
  return out;
}

async function main() {
  const results = [];
  for (const name of rooms) {
    try {
      results.push(await inspect(name));
    } catch (e) {
      results.push({ room: name, error: String((e as Error).message || e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
