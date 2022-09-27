import socketio from "socket.io";

class Game {
  //Game全体の変数管理
  io!: socketio.Server;
  connectionCount: number = 0;

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

      socket.on("okok", (data) => {
        console.log(data);
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
  }
}

export default Game;
