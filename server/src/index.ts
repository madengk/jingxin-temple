import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import wst from "@colyseus/ws-transport";
const { Server, matchMaker } = colyseus;
const { WebSocketTransport } = wst;
import { HallRoom } from "./rooms/HallRoom";
import { SIDE_HALLS, BUILD_VERSION } from "./shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 2567);
const dist = path.resolve(__dirname, process.env.DIST || "../../client/dist");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    name: "静心寺",
    version: BUILD_VERSION,
    rooms: ["courtyard", "main_hall", ...SIDE_HALLS.map((h) => h.room)],
    incense: "memory-only, 10 minutes per stick, no persistence",
  });
});

/** Current build id. no-cache so a running client can detect a new deploy. */
app.get("/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    ok: true,
    name: "静心寺",
    version: BUILD_VERSION,
  });
});

/** Player counts only — used to confirm a hall is empty without joining it. */
app.get("/presence", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({});
    res.json({
      ok: true,
      rooms: rooms.map((r) => ({
        name: r.name,
        roomId: r.roomId,
        clients: r.clients,
      })),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err as Error).message ?? err) });
  }
});

app.use(express.static(dist, {
  fallthrough: true,
  index: false,
  setHeaders(res, filePath) {
    if (path.basename(filePath) === "index.html") {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(glb|gltf|png|webp|jpe?g|ogg|m4a|mp3|woff2)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=604800");
    }
  },
}));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/matchmake") || req.path.startsWith("/colyseus")) {
    return next();
  }
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) next();
  });
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer, pingInterval: 4000, pingMaxRetries: 3 }),
});

// One singleton room per hall. filterBy is unnecessary — each has its own name.
gameServer.define("courtyard", HallRoom);
gameServer.define("main_hall", HallRoom);
for (const h of SIDE_HALLS) {
  gameServer.define(h.room, HallRoom);
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[静心寺] 法会已开，http://localhost:${PORT}`);
});

const shutdown = async () => {
  try {
    await gameServer.gracefullyShutdown();
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
