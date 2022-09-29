"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tetris_1 = __importDefault(require("./tetris"));
class Game {
    constructor() {
        // private tetris: Tetris;
        // _playing: boolean = false;
        this._currentUser = [];
        this._waitMatching = [];
        this._currentPlaying = [];
    }
    start(io) {
        this.io = io;
        //クライアントから発行されるイベントの登録
        this.ConnectServer();
        //ゲーム系イベントの登録
    }
    ConnectServer() {
        this.io.on("connection", (socket) => {
            console.log(`user ${socket.id} connected`);
            this.AddConnection(socket);
            //接続が切れた際の処理
            socket.on("disconnect", () => {
                console.log(`user ${socket.id} disconnected`);
                this.RemoveConnection(socket);
            });
            //マッチングの処理
            socket.on("matching", () => {
                if (this._waitMatching.map((user) => user.id).includes(socket.id))
                    return;
                this.emitMessage({ message: "waitMatching", socket: [socket] });
                const _user = this.getUser(socket);
                //マッチング中のユーザーを探す
                if (this._waitMatching.length > 0) {
                    //最初にマッチング待ちしている人とマッチングを行う
                    const opponent = this._waitMatching.shift();
                    clearTimeout(opponent.timeout);
                    opponent.timeout = undefined;
                    this._waitMatching = this._waitMatching.filter((value) => value.id !== opponent.id);
                    //ゲームを開始する
                    this.startGame(_user, opponent);
                }
                //いない場合は自分を登録して、30秒待ちマッチング処理をやめる
                else {
                    console.log("add");
                    const _timeout = setTimeout(() => {
                        this.emitMessage({
                            message: "makePopup",
                            data: { message: "マッチングに失敗しました" },
                            socket: [socket],
                        });
                        this._waitMatching = this._waitMatching.filter((value) => value.id !== socket.id);
                        console.log(socket.id, "マッチングに失敗しました");
                    }, 10000);
                    _user.timeout = _timeout;
                    this._waitMatching.push(_user);
                }
            });
            //ゲームイベント
            this.GameEvent(socket);
        });
    }
    GameEvent(socket) {
        //ゲーム準備ok
        socket.on("readyStart", (data) => {
            //全てのユーザが準備okならゲーム開始
            const [_game, _user] = this.getGame(socket);
            _user.status = "playing";
            if (_game.player1.status === "playing" &&
                _game.player2.status === "playing") {
                _game.tetris.gameStart();
            }
        });
        //ミノを動かした
        socket.on("moveMino", (direction) => {
            const [_game, _user] = this.getGame(socket);
            _game.tetris.moveMino(direction, _user);
        });
        //ミノを落とした
        socket.on("dropMino", (data) => {
            const [_game, _user] = this.getGame(socket);
            _game.tetris.dropMino(_user);
        });
        //ミノを回転させた
        socket.on("rotateMino", (direction) => {
            const [_game, _user] = this.getGame(socket);
            _game.tetris.rotateMino(direction, _user);
        });
    }
    AddConnection(socket) {
        const _user = {
            id: socket.id,
            socket: socket,
            timeout: undefined,
            status: "title",
        };
        this._currentUser.push(_user);
        this.io.emit("updateConnectionCount", {
            newConnectCount: this._currentUser.length,
        });
    }
    RemoveConnection(socket) {
        const _user = this.getUser(socket);
        if (_user.status === "matching") {
            this._waitMatching = this._waitMatching.filter((value) => value.id !== socket.id);
        }
        else if (_user.status === "playing" || _user.status === "ready") {
            //ユーザが参加しているゲームを探す
            const [_game, _user] = this.getGame(socket);
            //落ちた人と対戦していた人をタイトルに戻す
            const _opponent = _game.player1.id === socket.id ? _game.player2 : _game.player1;
            _opponent.status = "title";
            _game.tetris.makePopup("相手がゲームから退出しました", [
                _opponent.socket,
            ]);
            _game.tetris.gameEnd();
            //ゲームを終了させる
            this._currentPlaying = this._currentPlaying.filter((value) => value !== _game);
        }
        //接続中ユーザの情報を削除
        this._currentUser = this._currentUser.filter((value) => value.id !== socket.id);
        this.io.emit("updateConnectionCount", {
            newConnectCount: this._currentUser.length,
        });
    }
    //ソケットからuserの情報を取得する
    getUser(socket, game) {
        if (game) {
            return game.player1.id === socket.id ? game.player1 : game.player2;
        }
        const _user = this._currentUser.find((value) => value.id === socket.id);
        if (_user === undefined)
            throw new Error("user not found");
        return _user;
    }
    //ソケットから参加しているゲームを取得し、ゲームとユーザを返す
    getGame(socket) {
        const _game = this._currentPlaying.find((value) => {
            return value.player1.id === socket.id || value.player2.id === socket.id;
        });
        if (_game === undefined) {
            this.emitMessage({ message: "backToTitle", socket: [socket] });
            throw new Error("game not found");
        }
        const _user = _game.player1.id === socket.id ? _game.player1 : _game.player2;
        return [_game, _user];
    }
    //ゲームの作成を行う
    startGame(player1, player2) {
        const _roomId = player1.id + player2.id;
        const _tetris = new tetris_1.default(this, _roomId, [player1, player2]);
        const _matchingData = {
            roomId: _roomId,
            player1: player1,
            player2: player2,
            tetris: _tetris,
        };
        this._currentPlaying.push(_matchingData);
        player1.status = "ready";
        player2.status = "ready";
        //ゲーム開始
        this.emitMessage({ message: "startGame", roomId: _roomId });
        //_game.gameStart();
    }
    gameFinished(roomId) {
        const _game = this._currentPlaying.find((value) => value.roomId === roomId);
        if (_game === undefined)
            throw new Error("game not found");
        _game.player1.status = "title";
        _game.player2.status = "title";
        this._currentPlaying = this._currentPlaying.filter((value) => value.roomId !== roomId);
    }
    //メッセージを送信する
    emitMessage(data) {
        //ルームIDがある場合はルームに送信
        if (data.roomId) {
            const _game = this._currentPlaying.find((value) => value.roomId === data.roomId);
            if (_game === undefined)
                throw new Error("game not found");
            _game.player1.socket.emit(data.message, data.data);
            _game.player2.socket.emit(data.message, data.data);
            return;
        }
        //ソケットIDがある場合はソケットに送信
        if (data.socket) {
            data.socket.forEach((user) => {
                user.emit(data.message, data.data);
            });
            return;
        }
        //それ以外は全体に送信
        this.io.emit(data.message, data.data);
    }
}
exports.default = Game;
