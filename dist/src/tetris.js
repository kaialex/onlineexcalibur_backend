"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timers_1 = require("timers");
const minodata_1 = require("./minodata");
class Tetris {
    constructor(game, roomId, player) {
        this._score = {};
        //ゲームのあるroomid
        this._roomId = "";
        this._board = Array(20)
            .fill(0)
            .map(() => Array(10).fill(0));
        this._minoqueue = [];
        this._game = game;
        this._roomId = roomId;
        this._player = player;
        this._currentTurnUser = Math.random() > 0.5 ? player[0] : player[1];
        this._player.forEach((player) => {
            this._score[player.id] = 0;
        });
    }
    gameStart() {
        console.log("gameStart");
        this.ResetBoard();
        this.AddMinoQueue();
        this._currentMino = { minodata: this.getNextMino(), pos: { x: 3, y: 0 } };
        this.makeMino();
        //タイマースタート2秒おきに、ミノを落とす
        this.resetTimer();
    }
    resetTimer() {
        if (this._interval_id !== undefined) {
            (0, timers_1.clearInterval)(this._interval_id);
        }
        this._interval_id = setInterval(() => {
            this.moveMino("down", this._currentTurnUser);
        }, 500);
    }
    gameEnd() {
        console.log("gameEnd");
        (0, timers_1.clearInterval)(this._interval_id);
        this.ResetBoard();
        this._game.emitMessage({
            message: "backToTitle",
            roomId: this._roomId,
        });
        this._game.gameFinished(this._roomId);
    }
    makePopup(message, socket) {
        this._game.emitMessage({
            message: "makePopup",
            data: { message: message },
            socket: socket,
        });
    }
    //ミノを動かす
    moveMino(direction, _user) {
        if (_user !== this._currentTurnUser)
            return;
        const dirvec = {
            right: { x: 1, y: 0 },
            left: { x: -1, y: 0 },
            down: { x: 0, y: 1 },
        };
        if (this.canPut(dirvec[direction].x, dirvec[direction].y)) {
            this._currentMino.pos.x += dirvec[direction].x;
            this._currentMino.pos.y += dirvec[direction].y;
            this._game.emitMessage({
                message: "updateMino",
                data: { pos: this._currentMino.pos },
                roomId: this._roomId,
            });
        }
        else {
            if (direction == "down") {
                this.fixMino();
            }
        }
    }
    //ミノを落とす
    dropMino(_user) {
        if (_user !== this._currentTurnUser)
            return;
        while (this.canPut(0, 1)) {
            this.moveMino("down", this._currentTurnUser);
        }
        this.resetTimer();
        //this.fixMino();
    }
    //ミノを回転する
    rotateMino(direction, _user) {
        if (_user !== this._currentTurnUser)
            return;
        let _nextblockdata;
        let _pos = {
            x: this._currentMino.pos.x,
            y: this._currentMino.pos.y,
        };
        if (direction === "right") {
            _nextblockdata = (0, minodata_1.RotateRight)(this._currentMino.minodata.blockdata);
        }
        else if (direction === "left") {
            _nextblockdata = (0, minodata_1.RotateLeft)(this._currentMino.minodata.blockdata);
        }
        //回転後のミノが盤面外に出ないか判定、出る場合は移動させておさめる
        if (!this.canPut(0, 0, _nextblockdata)) {
            if (this.canPut(1, 0, _nextblockdata)) {
                _pos.x += 1;
            }
            else if (this.canPut(-1, 0, _nextblockdata)) {
                _pos.x -= 1;
            }
            else if (this.canPut(0, -1, _nextblockdata)) {
                _pos.y -= 1;
            }
            else if (this.canPut(0, -2, _nextblockdata)) {
                _pos.y -= 2;
            }
            else if (this.canPut(2, 0, _nextblockdata)) {
                _pos.x += 2;
            }
            else if (this.canPut(-2, 0, _nextblockdata)) {
                _pos.x -= 2;
            }
            else if (this.canPut(0, 1, _nextblockdata)) {
                _pos.y += 1;
            }
            else {
                console.log("回転できません");
                return;
            }
        }
        this._currentMino.minodata.blockdata = _nextblockdata;
        this._currentMino.pos = _pos;
        this._game.emitMessage({
            message: "updateMino",
            data: {
                pos: _pos,
                blockdata: this._currentMino.minodata.blockdata,
            },
            roomId: this._roomId,
        });
    }
    fixMino() {
        //ミノを固定する
        for (let i = 0; i < this._currentMino.minodata.blockdata.length; i++) {
            for (let j = 0; j < this._currentMino.minodata.blockdata[i].length; j++) {
                if (this._currentMino.minodata.blockdata[i][j] === 1) {
                    this._board[this._currentMino.pos.y + i][this._currentMino.pos.x + j] = minodata_1.boardData[this._currentMino.minodata.name];
                }
            }
        }
        //ライン消す判定を行い、データを送信
        const deleteline = this.lineCheck();
        if (deleteline.length != 0) {
            this._score[this._currentTurnUser.id] += deleteline.length;
            this._game.emitMessage({
                message: "deleteLine",
                data: deleteline,
                roomId: this._roomId,
            });
            deleteline.forEach((line) => {
                delete this._board[line];
            });
            this._board = this._board.filter((line) => line != undefined);
            deleteline.forEach(() => {
                this._board.unshift(Array(10).fill(0));
            });
        }
        //ゲームオーバー判定を行い、データを送信
        if (this.gameOverCheck()) {
            this.gameEnd();
            if (this._score[this._player[0].id] == this._score[this._player[1].id]) {
                this.makePopup(`引き分け! スコア:${this._score[this._player[0].id]}`, this._player.map((user) => user.socket));
            }
            else {
                const [winner, loser] = this._score[this._player[0].id] > this._score[this._player[1].id]
                    ? [0, 1]
                    : [1, 0];
                const winnerUser = this._player[winner];
                const loserUser = this._player[loser];
                this.makePopup(`あなたの勝ち! スコア:${this._score[winnerUser.id]}`, [
                    winnerUser.socket,
                ]);
                this.makePopup(`あなたの負け! スコア:${this._score[loserUser.id]}`, [
                    loserUser.socket,
                ]);
            }
            this.ResetBoard();
            return;
        }
        //次のミノを作る
        this._currentMino = { minodata: this.getNextMino(), pos: { x: 3, y: 0 } };
        this.makeMino();
        //ターンを変える
        this._currentTurnUser =
            this._currentTurnUser === this._player[0]
                ? this._player[1]
                : this._player[0];
    }
    //ミノの作成
    makeMino() {
        this._game.emitMessage({
            message: "makeMino",
            data: {
                nextboard: this._board,
                nextmino: this._currentMino.minodata,
                startpos: this._currentMino.pos,
            },
            roomId: this._roomId,
        });
    }
    //消せるラインがあるか判定
    lineCheck() {
        const line = [];
        for (let i = 0; i < this._board.length; i++) {
            if (this._board[i].every((value) => value !== 0)) {
                line.push(i);
            }
        }
        return line;
    }
    //ゲームオーバーの判定
    gameOverCheck() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < this._board[i].length; j++) {
                if (this._board[i][j] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }
    //現在の位置からblockdata時にx,yだけ動かせるか、チェック
    canPut(x = 0, y = 0, blockdata = this._currentMino.minodata.blockdata) {
        for (let i = 0; i < blockdata.length; i++) {
            for (let j = 0; j < blockdata[i].length; j++) {
                if (blockdata[i][j] === 1) {
                    const check_x = this._currentMino.pos.x + j + x;
                    const check_y = this._currentMino.pos.y + i + y;
                    if (check_x < 0 || check_x >= 10)
                        return false;
                    if (check_y < 0 || check_y >= 20)
                        return false;
                    if (this._board[check_y][check_x] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    //次のミノ情報を取得
    getNextMino() {
        if (this._minoqueue.length <= 1) {
            this.AddMinoQueue();
        }
        const nextmino = this._minoqueue.shift();
        return nextmino;
    }
    //次のミノを追加
    AddMinoQueue() {
        this._minoqueue = this._minoqueue.concat(this.shuffle(minodata_1.MinoData));
    }
    //Arrayのランダムシャッフル
    shuffle(array) {
        for (let i = array.length; 1 < i; i--) {
            let k = Math.floor(Math.random() * i);
            [array[k], array[i - 1]] = [array[i - 1], array[k]];
        }
        return array;
    }
    //盤面をリセットする
    ResetBoard() {
        for (let i = 0; i < this._board.length; i++) {
            for (let j = 0; j < this._board[i].length; j++) {
                this._board[i][j] = 0;
            }
        }
    }
}
exports.default = Tetris;
