const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Chess } = require("chess.js");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = require("socket.io")(3001, {
  cors: {
    origin: "*",
  },
});

const games = new Map();
const userGames = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Game creation
  socket.on("createGame", ({ colorPreference, gameType, timeControl }) => {
    const gameCode = generateGameCode();
    const chessGame = new Chess();

    let playerColor = colorPreference;
    if (colorPreference === "random") {
      playerColor = Math.random() < 0.5 ? "w" : "b";
    }

    games.set(gameCode, {
      chessGame,
      players: {
        white: playerColor === "w" ? socket.id : null,
        black: playerColor === "b" ? socket.id : null,
      },
      gameType,
      timeControl,
      timeLeft: { white: timeControl * 60, black: timeControl * 60 },
      lastMoveTime: null,
      timerInterval: null,
    });
    userGames.set(socket.id, gameCode);

    socket.emit("gameCreated", {
      gameCode,
      color: playerColor,
      fen: chessGame.fen(),
      gameType,
      timeControl,
    });
    console.log(
      `Game created: ${gameCode}, Type: ${gameType}, Time: ${timeControl} min`
    );
  });

  // Game joining
  socket.on("joinGame", (gameCode) => {
    const game = games.get(gameCode);
    if (!game) {
      return socket.emit("joinError", "Game not found");
    }

    let joinedColor;
    if (!game.players.white) {
      game.players.white = socket.id;
      joinedColor = "w";
    } else if (!game.players.black) {
      game.players.black = socket.id;
      joinedColor = "b";
    } else {
      return socket.emit("joinError", "Game is full");
    }

    userGames.set(socket.id, gameCode);
    socket.emit("gameJoined", {
      gameCode,
      color: joinedColor,
      fen: game.chessGame.fen(),
      opponentName: "Opponent",
      gameType: game.gameType,
      timeControl: game.timeControl,
      timeLeft: game.timeLeft,
    });

    const opponentSocket =
      joinedColor === "w" ? game.players.black : game.players.white;
    if (opponentSocket) {
      io.to(opponentSocket).emit("opponentJoined", {
        fen: game.chessGame.fen(),
        opponentName: "Opponent",
        timeLeft: game.timeLeft,
        timeControl: game.timeControl,
      });
    }

    if (game.players.white && game.players.black) {
      startGameTimer(gameCode);
    }

    console.log(`Player joined: ${socket.id} to game ${gameCode}`);
  });

  socket.on("makeMove", ({ gameCode, move }) => {
    const game = games.get(gameCode);
    if (!game) {
      return socket.emit("moveError", "Game not found");
    }

    const result = game.chessGame.move(move);
    if (result) {
      const nextTurn = game.chessGame.turn();
      updateGameTimer(gameCode, nextTurn);

      const updatedFen = game.chessGame.fen();
      io.to(game.players.white).emit("moveMade", {
        fen: updatedFen,
        move: result,
        turn: nextTurn,
        timeLeft: game.timeLeft,
      });
      io.to(game.players.black).emit("moveMade", {
        fen: updatedFen,
        move: result,
        turn: nextTurn,
        timeLeft: game.timeLeft,
      });
    } else {
      socket.emit("moveError", "Invalid move");
    }

    checkGameOver(gameCode);
  });
});
{
}
function startGameTimer(gameCode) {
  const game = games.get(gameCode);
  if (!game) return;

  game.lastMoveTime = Date.now();
  game.timerInterval = setInterval(() => updateGameTimer(gameCode), 1000);
}

function updateGameTimer(gameCode, nextTurn) {
  const game = games.get(gameCode);
  if (!game) return;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - game.lastMoveTime) / 1000);

  if (nextTurn) {
    const currentColor = nextTurn === "w" ? "black" : "white";
    game.timeLeft[currentColor] -= elapsedSeconds;
    game.lastMoveTime = now;
  } else {
    const currentColor = game.chessGame.turn() === "w" ? "white" : "black";
    game.timeLeft[currentColor] -= 1;
  }

  if (game.timeLeft.white <= 0 || game.timeLeft.black <= 0) {
    checkGameOver(gameCode);
  }

  io.to(game.players.white).emit("timeUpdate", game.timeLeft);
  io.to(game.players.black).emit("timeUpdate", game.timeLeft);
}

function checkGameOver(gameCode) {
  const game = games.get(gameCode);
  if (!game) return;

  let gameOverReason = null;

  if (game.chessGame.isGameOver()) {
    if (game.chessGame.isCheckmate()) {
      gameOverReason = "Checkmate";
    } else if (game.chessGame.isDraw()) {
      gameOverReason = "Draw";
    } else if (game.chessGame.isStalemate()) {
      gameOverReason = "Stalemate";
    }
  } else if (game.timeLeft.white <= 0) {
    gameOverReason = "White out of time";
  } else if (game.timeLeft.black <= 0) {
    gameOverReason = "Black out of time";
  }

  if (gameOverReason) {
    clearInterval(game.timerInterval);
    io.to(game.players.white).emit("gameOver", {
      fen: game.chessGame.fen(),
      result: gameOverReason,
    });
    io.to(game.players.black).emit("gameOver", {
      fen: game.chessGame.fen(),
      result: gameOverReason,
    });
    games.delete(gameCode);
    console.log(`Game over: ${gameOverReason} in game ${gameCode}`);
  }
}

// Generate a random game code
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
