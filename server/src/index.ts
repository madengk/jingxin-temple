import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import wst from "@colyseus/ws-transport";
const { Server } = colyseus;
const { WebSocketTransport } = wst;
import { MainHallRoom } from "./rooms/MainHallRoom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 2567);
const dist = path.resolve(__dirname, "../../client/dist");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "静心寺", room: "main_hall" });
});

app.use(express.static(dist, { fallthrough: true, index: false }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/matchmake") || req.path.startsWith("/colyseus")) {
    return next();
  }
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) next();
  });
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});
gameServer.define("main_hall", MainHallRoom);

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
