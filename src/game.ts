import socketio from "socket.io";
import { isShorthandPropertyAssignment } from "typescript";
import Tetris from "./tetris";

interface matchingData {
  roomId: string;
  player1: userData;
  player2: userData;
  tetris: Tetris;
}

export interface userData {
  id: string;
  socket: socketio.Socket;
  timeout: NodeJS.Timeout | undefined;
  status: "title" | "matching" | "playing" | "ready" | "other";
}

interface messageProps {
  message: string;
  data?: any;
  socket?: socketio.Socket[];
  roomId?: string;
}

class Game {
  //Game全体の変数管理
  private io!: socketio.Server;
  // private tetris: Tetris;
  // _playing: boolean = false;

  private _currentUser: userData[] = [];
  private _waitMatching: userData[] = [];
  private _currentPlaying: matchingData[] = [];

  constructor() {}

  public start(io: socketio.Server): void {
    this.io = io;
    //クライアントから発行されるイベントの登録
    this.ConnectServer();
    //ゲーム系イベントの登録
  }

  private ConnectServer(): void {
    this.io.on("connection", (socket: socketio.Socket) => {
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
        _user.status = "matching";

        //マッチング中のユーザーを探す
        if (this._waitMatching.length > 0) {
          //最初にマッチング待ちしている人とマッチングを行う
          const opponent = this._waitMatching.shift();
          clearTimeout(opponent!.timeout);
          opponent!.timeout = undefined;
          this._waitMatching = this._waitMatching.filter(
            (value) => value.id !== opponent!.id
          );

          //ゲームを開始する
          this.startGame(_user, opponent!);
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
            this._waitMatching = this._waitMatching.filter(
              (value) => value.id !== socket.id
            );
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

  private GameEvent(socket: socketio.Socket): void {
    //ゲーム準備ok
    socket.on("readyStart", (data) => {
      //全てのユーザが準備okならゲーム開始
      const [_game, _user] = this.getGame(socket);
      _user.status = "playing";

      if (
        _game.player1.status === "playing" &&
        _game.player2.status === "playing"
      ) {
        _game.tetris.gameStart();
      }
    });

    //ミノを動かした
    socket.on("moveMino", (direction: "left" | "right") => {
      const [_game, _user] = this.getGame(socket);
      _game.tetris.moveMino(direction, _user);
    });

    //ミノを落とした
    socket.on("dropMino", (data) => {
      const [_game, _user] = this.getGame(socket);
      _game.tetris.dropMino(_user);
    });

    //ミノを回転させた
    socket.on("rotateMino", (direction: "left" | "right") => {
      const [_game, _user] = this.getGame(socket);
      _game.tetris.rotateMino(direction, _user);
    });
  }

  private AddConnection(socket: socketio.Socket): void {
    const _user: userData = {
      id: socket.id,
      socket: socket,
      timeout: undefined,
      status: "title",
    };
    this._currentUser.push(_user);
  }

  private RemoveConnection(socket: socketio.Socket): void {
    const _user = this.getUser(socket);
    console.log(_user.status);
    if (_user.status === "matching") {
      this._waitMatching = this._waitMatching.filter(
        (value) => value.id !== socket.id
      );
      _user.status = "title";
    } else if (_user.status === "playing" || _user.status === "ready") {
      //ユーザが参加しているゲームを探す
      const [_game, _user] = this.getGame(socket);
      //落ちた人と対戦していた人をタイトルに戻す
      const _opponent =
        _game.player1.id === socket.id ? _game.player2 : _game.player1;
      _opponent.status = "title";
      _game.tetris.makePopup("相手がゲームから退出しました", [
        _opponent.socket,
      ]);
      _game.tetris.gameEnd();

      //ゲームを終了させる
      this._currentPlaying = this._currentPlaying.filter(
        (value) => value !== _game
      );
    }

    //接続中ユーザの情報を削除
    this._currentUser = this._currentUser.filter(
      (value) => value.id !== socket.id
    );
  }

  //ソケットからuserの情報を取得する
  private getUser(socket: socketio.Socket, game?: matchingData): userData {
    if (game) {
      return game.player1.id === socket.id ? game.player1 : game.player2;
    }
    const _user = this._currentUser.find((value) => value.id === socket.id);
    if (_user === undefined) throw new Error("user not found");
    return _user;
  }

  //ソケットから参加しているゲームを取得し、ゲームとユーザを返す
  private getGame(socket: socketio.Socket): [matchingData, userData] {
    const _game = this._currentPlaying.find((value) => {
      return value.player1.id === socket.id || value.player2.id === socket.id;
    });
    if (_game === undefined) {
      this.emitMessage({ message: "backToTitle", socket: [socket] });
      throw new Error("game not found");
    }
    const _user =
      _game.player1.id === socket.id ? _game.player1 : _game.player2;
    return [_game, _user];
  }

  //ゲームの作成を行う
  private startGame(player1: userData, player2: userData) {
    const _roomId = player1.id + player2.id;
    const _tetris = new Tetris(this, _roomId, [player1, player2]);
    const _matchingData: matchingData = {
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

  public gameFinished(roomId: string) {
    const _game = this._currentPlaying.find((value) => value.roomId === roomId);
    if (_game === undefined) throw new Error("game not found");
    _game.player1.status = "title";
    _game.player2.status = "title";
    this._currentPlaying = this._currentPlaying.filter(
      (value) => value.roomId !== roomId
    );
  }

  //メッセージを送信する
  public emitMessage(data: messageProps): void {
    //ルームIDがある場合はルームに送信
    if (data.roomId) {
      const _game = this._currentPlaying.find(
        (value) => value.roomId === data.roomId
      );
      if (_game === undefined) throw new Error("game not found");
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

export default Game;
