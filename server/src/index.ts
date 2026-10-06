import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { createServer } from "http";
import { existsSync } from "fs";
import { resolve } from "path";
import { ROOM_NAME, SERVER_PORT } from "../../shared/game";
import { RiftRoom } from "./RiftRoom";
import { accountRoutes } from "./accounts";

const port = Number(process.env.PORT ?? SERVER_PORT);
const app = express();

// Serve the built client (npm run build) so one process can host the whole game.
const clientDist = resolve(__dirname, "../../client/dist");
if (existsSync(clientDist)) app.use(express.static(clientDist));
accountRoutes(app); // sign up / sign in, and the saved record
app.get("/health", (_req, res) => res.send("ok"));

const gameServer = new Server({ transport: new WebSocketTransport({ server: createServer(app) }) });
// Players only share a room with others who picked the same stage.
gameServer.define(ROOM_NAME, RiftRoom).filterBy(["stage", "code"]); // same mode + same room number meet
gameServer.listen(port).then(() => console.log(`Untitled Versus server listening on http://localhost:${port}`));
