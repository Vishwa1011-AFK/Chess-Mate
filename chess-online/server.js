const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Chess } = require("chess.js");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store active games with more detailed state
const games = new Map();
const userGames = new Map(); // Track which game each user is in

function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createNewGame() {
  return {
    game: new Chess(),
    players: [],
    colors: {},
    status: "waiting", // waiting, active, finished
    lastMove: null,
    created: Date.now(),
  };
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Create a new game with a simple code
  socket.on("createGame", () => {
    const gameCode = generateGameCode();
    const gameData = createNewGame();

    games.set(gameCode, gameData);
    userGames.set(socket.id, gameCode);

    // Add creator as white player
    gameData.players.push(socket.id);
    gameData.colors[socket.id] = "w";

    socket.join(gameCode);

    console.log(`Game created: ${gameCode} by ${socket.id}`);

    socket.emit("gameCreated", {
      gameCode,
      color: "w",
      fen: gameData.game.fen(),
    });
  });

  // Join an existing game using the code
  socket.on("joinGame", (gameCode) => {
    console.log(`Join attempt: ${gameCode} by ${socket.id}`);
    const gameData = games.get(gameCode);

    if (!gameData) {
      socket.emit("joinError", "Game not found");
      return;
    }

    if (gameData.players.length >= 2) {
      socket.emit("joinError", "Game is full");
      return;
    }

    if (gameData.status !== "waiting") {
      socket.emit("joinError", "Game already in progress");
      return;
    }

    // Add second player as black
    gameData.players.push(socket.id);
    gameData.colors[socket.id] = "b";
    gameData.status = "active";

    socket.join(gameCode);
    userGames.set(socket.id, gameCode);

    // Notify the joining player
    socket.emit("gameJoined", {
      gameCode,
      color: "b",
      fen: gameData.game.fen(),
    });

    // Notify the first player
    socket.to(gameCode).emit("opponentJoined", {
      color: "b",
      fen: gameData.game.fen(),
    });

    console.log(`Game ${gameCode} started with players:`, gameData.players);
  });

  socket.on("makeMove", ({ gameCode, move }) => {
    console.log(`Move attempt in game ${gameCode} by ${socket.id}`);
    const gameData = games.get(gameCode);

    if (!gameData) {
      socket.emit("moveError", "Game not found");
      return;
    }

    const playerColor = gameData.colors[socket.id];
    if (playerColor !== gameData.game.turn()) {
      socket.emit("moveError", "Not your turn");
      return;
    }

    try {
      const result = gameData.game.move(move);
      if (result) {
        const newFen = gameData.game.fen();
        gameData.lastMove = result;

        // Broadcast the move to all players including sender
        io.in(gameCode).emit("moveMade", {
          fen: newFen,
          move: result,
          turn: gameData.game.turn(),
        });

        console.log(`Move made in game ${gameCode}:`, {
          by: socket.id,
          move: result,
          newFen,
        });

        if (gameData.game.isGameOver()) {
          gameData.status = "finished";
          io.in(gameCode).emit("gameOver", {
            fen: newFen,
            result: getGameResult(gameData.game),
          });
        }
      }
    } catch (error) {
      console.error("Move error:", error);
      socket.emit("moveError", "Invalid move");
    }
  });

  socket.on("disconnect", () => {
    const gameCode = userGames.get(socket.id);
    if (gameCode) {
      const gameData = games.get(gameCode);
      if (gameData) {
        // Remove player from game
        const playerIndex = gameData.players.indexOf(socket.id);
        if (playerIndex !== -1) {
          gameData.players.splice(playerIndex, 1);
          delete gameData.colors[socket.id];

          if (gameData.players.length === 0) {
            games.delete(gameCode);
            console.log(`Game ${gameCode} deleted - no players remaining`);
          } else {
            gameData.status = "finished";
            io.in(gameCode).emit("playerLeft", {
              message: "Opponent disconnected",
            });
          }
        }
      }
      userGames.delete(socket.id);
    }
    console.log("Client disconnected:", socket.id);
  });
});

function getGameResult(game) {
  if (game.isCheckmate())
    return `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins.`;
  if (game.isDraw()) return "It's a draw!";
  if (game.isStalemate()) return "Stalemate!";
  if (game.isThreefoldRepetition()) return "Draw by threefold repetition.";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material.";
  return "Game over.";
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
