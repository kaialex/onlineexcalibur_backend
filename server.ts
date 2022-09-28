import express, { Application, Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import Game from "./src/game";

const app: Application = express();
const server: http.Server = http.createServer(app);

const PORT: string = process.env.PORT || "8080";
//本番環境ではnetlifyのURLを指定する
const path: string = "http://localhost:3000";

const io: Server = new Server(server, {
  cors: {
    origin: path,
  },
});

const game = new Game();
game.start(io);

server.listen(PORT, () => {
  console.log(`ポート${PORT}番で起動しました。`);
});
