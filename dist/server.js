"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const game_1 = __importDefault(require("./src/game"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || "8080";
//本番環境ではnetlifyのURLを指定する
const path = "https://cosmic-kitsune-a7f220.netlify.app/";
const io = new socket_io_1.Server(server, {
    cors: {
        origin: path,
    },
});
const game = new game_1.default();
game.start(io);
server.listen(PORT, () => {
    console.log(`ポート${PORT}番で起動しました。`);
});
