import { BlockList } from "net";
import socketio from "socket.io";
import { clearInterval } from "timers";
import Game from "./game";
import {
  block,
  colorData,
  MinoData,
  MinoProps,
  RotateLeft,
  RotateRight,
} from "./minodata";

class Tetris {
  //テトリスの情報
  private _game: Game;

  //現在の盤面状態
  private _board: number[][];
  //次のミノの種類
  private _minoqueue: MinoProps[];
  private _currentMino!: { minodata: MinoProps; pos: { x: number; y: number } };
  private _interval_id!: NodeJS.Timeout;

  constructor(game: Game) {
    this._board = Array(20)
      .fill(0)
      .map(() => Array(10).fill(0));
    this._minoqueue = [];
    this._game = game;
  }

  public gameStart(): void {
    console.log("gameStart");
    this.ResetBoard();
    this.AddMinoQueue();

    this._currentMino = { minodata: this.getNextMino(), pos: { x: 3, y: 0 } };
    this.makeMino();

    //タイマースタート2秒おきに、ミノを落とす
    this.resetTimer();
  }

  public resetTimer() {
    if (this._interval_id !== undefined) {
      clearInterval(this._interval_id);
    }
    this._interval_id = setInterval(() => {
      this.moveMino("down");
    }, 500);
  }

  public gameEnd(message: string): void {
    console.log("gameEnd");
    clearInterval(this._interval_id);
    this.ResetBoard();
    this._game.emitMessage("backToTitle", { message: message });
    this._game._playing = false;
  }

  //ミノを動かす
  public moveMino(direction: "right" | "left" | "down"): void {
    const dirvec = {
      right: { x: 1, y: 0 },
      left: { x: -1, y: 0 },
      down: { x: 0, y: 1 },
    };
    if (this.canPut(dirvec[direction].x, dirvec[direction].y)) {
      this._currentMino.pos.x += dirvec[direction].x;
      this._currentMino.pos.y += dirvec[direction].y;
      this._game.emitMessage("updateMino", { pos: this._currentMino.pos });
    } else {
      if (direction == "down") {
        this.fixMino();
      }
    }
  }

  //ミノを落とす
  public dropMino(): void {
    while (this.canPut(0, 1)) {
      this.moveMino("down");
    }
    this.resetTimer();
    //this.fixMino();
  }

  //ミノを回転する
  public rotateMino(direction: "right" | "left"): void {
    let _nextblockdata: block[][];
    let _pos: { x: number; y: number } = {
      x: this._currentMino.pos.x,
      y: this._currentMino.pos.y,
    };
    if (direction === "right") {
      _nextblockdata = RotateRight(this._currentMino.minodata.blockdata);
    } else if (direction === "left") {
      _nextblockdata = RotateLeft(this._currentMino.minodata.blockdata);
    }
    if (!this.canPut(0, 0, _nextblockdata!)) {
      if (this.canPut(1, 0, _nextblockdata!)) {
        _pos.x += 1;
      } else if (this.canPut(-1, 0, _nextblockdata!)) {
        _pos.x -= 1;
      } else if (this.canPut(0, -1, _nextblockdata!)) {
        _pos.y -= 1;
      } else if (this.canPut(0, -2, _nextblockdata!)) {
        _pos.y -= 2;
      } else if (this.canPut(2, 0, _nextblockdata!)) {
        _pos.x += 2;
      } else if (this.canPut(-2, 0, _nextblockdata!)) {
        _pos.x -= 2;
      } else if (this.canPut(0, 1, _nextblockdata!)) {
        _pos.y += 1;
      } else {
        console.log("回転できません");
        return;
      }
    }
    this._currentMino.minodata.blockdata = _nextblockdata!;
    this._currentMino.pos = _pos;
    console.log(_pos);
    this._game.emitMessage("updateMino", {
      pos: _pos,
      blockdata: this._currentMino.minodata.blockdata,
    });
  }

  private fixMino(): void {
    //ミノを固定する
    for (let i = 0; i < this._currentMino.minodata.blockdata.length; i++) {
      for (let j = 0; j < this._currentMino.minodata.blockdata[i].length; j++) {
        if (this._currentMino.minodata.blockdata[i][j] === 1) {
          this._board[this._currentMino.pos.y + i][
            this._currentMino.pos.x + j
          ] = colorData[this._currentMino.minodata.name];
        }
      }
    }

    //ライン消す判定を行い、データを送信
    const deleteline = this.lineCheck();
    if (deleteline.length != 0) {
      this._game.emitMessage("deleteLine", deleteline);
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
      this.gameEnd("Game Over");
      this.ResetBoard();
      return;
    }

    //次のミノを作る
    this._currentMino = { minodata: this.getNextMino(), pos: { x: 3, y: 0 } };
    this.makeMino();
  }

  public makeMino(socket?: socketio.Socket): void {
    this._game.emitMessage(
      "makeMino",
      {
        nextboard: this._board,
        nextmino: this._currentMino.minodata,
        startpos: this._currentMino.pos,
      },
      socket
    );
  }

  //消せるラインがあるか判定
  private lineCheck(): number[] {
    const line: number[] = [];
    for (let i = 0; i < this._board.length; i++) {
      if (this._board[i].every((value) => value !== 0)) {
        line.push(i);
      }
    }
    console.log(line);
    return line;
  }

  //ゲームオーバーの判定
  private gameOverCheck(): boolean {
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
  private canPut(
    x: number = 0,
    y: number = 0,
    blockdata: block[][] = this._currentMino.minodata.blockdata
  ): boolean {
    for (let i = 0; i < blockdata.length; i++) {
      for (let j = 0; j < blockdata[i].length; j++) {
        if (blockdata[i][j] === 1) {
          const check_x = this._currentMino.pos.x + j + x;
          const check_y = this._currentMino.pos.y + i + y;
          if (check_x < 0 || check_x >= 10) return false;
          if (check_y < 0 || check_y >= 20) return false;
          if (this._board[check_y][check_x] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  //次のミノ情報を取得
  private getNextMino(): MinoProps {
    if (this._minoqueue.length <= 1) {
      this.AddMinoQueue();
    }
    const nextmino = this._minoqueue.shift();
    return nextmino!;
  }

  //次のミノを追加
  private AddMinoQueue(): void {
    this._minoqueue = this._minoqueue.concat(this.shuffle(MinoData));
  }

  //Arrayのランダムシャッフル
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length; 1 < i; i--) {
      let k = Math.floor(Math.random() * i);
      [array[k], array[i - 1]] = [array[i - 1], array[k]];
    }
    return array;
  }

  //盤面をリセットする
  private ResetBoard(): void {
    for (let i = 0; i < this._board.length; i++) {
      for (let j = 0; j < this._board[i].length; j++) {
        this._board[i][j] = 0;
      }
    }
  }
}

export default Tetris;
