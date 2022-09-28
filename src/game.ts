import socketio from "socket.io";
import Tetris from "./tetris";

class Game {
  //Game全体の変数管理
  private io!: socketio.Server;
  private connectionCount: number = 0;
  private tetris: Tetris;
  _playing: boolean = false;

  constructor() {
    this.tetris = new Tetris(this);
  }

  public start(io: socketio.Server): void {
    this.io = io;
    //クライアントから発行されるイベントの登録
    this.ConnectServer();
  }

  private ConnectServer(): void {
    this.io.on("connection", (socket: socketio.Socket) => {
      console.log(`user ${socket.id} connected`);
      this.AddConnection();

      //接続が切れた際の処理
      socket.on("disconnect", () => {
        console.log(`user ${socket.id} disconnected`);
        this.RemoveConnection();
      });

      //ゲーム準備ok
      socket.on("readyStart", (data) => {
        if (this._playing) {
          this.tetris.makeMino(socket);
          return;
        }
        this._playing = true;
        this.tetris.gameStart();
      });

      socket.on("moveMino", (direction: "left" | "right") => {
        this.tetris.moveMino(direction);
      });

      socket.on("dropMino", (data) => {
        this.tetris.dropMino();
      });

      socket.on("rotateMino", (direction: "left" | "right") => {
        this.tetris.rotateMino(direction);
      });
    });
  }

  private AddConnection(): void {
    this.connectionCount++;
    this.io.emit("updateConnectionCount", {
      newConnectCount: this.connectionCount,
    });
  }

  private RemoveConnection(): void {
    this.connectionCount--;
    this.io.emit("updateConnectionCount", {
      newConnectCount: this.connectionCount,
    });

    if (!this._playing) return;
    this.tetris.gameEnd(
      "相手とのコネクションが切断されたためタイトルに戻ります"
    );
    this._playing = false;
  }

  public emitMessage(
    message: string,
    data?: any,
    socket?: socketio.Socket
  ): void {
    if (socket) socket.emit(message, data);
    else this.io.emit(message, data);
  }
}

export default Game;
