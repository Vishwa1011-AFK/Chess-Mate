import React, { useState, useCallback, useEffect, useRef } from "react";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";
import io from "socket.io-client";
import UserTile from "./UserTile";
import PromotionModal from "./PromotionModal";
import soundManager, { playMoveSound } from "../utils/SoundManager";
import './ChessBoard.css';

const SOCKET_SERVER_URL = "http://localhost:3001";

const gameTypes = [
  { name: "Blitz", time: 3 },
  { name: "Speed", time: 5 },
  { name: "Classic", time: 10 },
  { name: "Long", time: 30 },
];

const ChessBoardComponent = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("start");
  const [gameCode, setGameCode] = useState(null);
  const [socket, setSocket] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [status, setStatus] = useState("Waiting for game");
  const [currentTurn, setCurrentTurn] = useState("w");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());
  const [playerName, setPlayerName] = useState("You");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]);
  const [selectedColor, setSelectedColor] = useState("random");
  const timerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState({ white: 0, black: 0 });
  const timerInterval = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket']
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
    });

    newSocket.on("gameCreated", ({ gameCode, color, fen }) => {
      console.log("Game created:", gameCode);
      setGameCode(gameCode);
      setPlayerColor(color);
      setPlayerName("Player 1");
      updateGameState(fen);
      setStatus(`Game created. Share code: ${gameCode}`);
    });

    newSocket.on("gameJoined", ({ gameCode, color, fen, opponentName, timeControl }) => {
      console.log("Game joined:", gameCode);
      setGameCode(gameCode);
      setPlayerColor(color);
      setPlayerName("Player 2");
      setOpponentName(opponentName);
      updateGameState(fen);
      setStatus(`Game started - You are ${color === 'w' ? 'White' : 'Black'}`);
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 });
    });

    newSocket.on("opponentJoined", ({ fen, opponentName, timeControl }) => {
      console.log("Opponent joined");
      setOpponentName(opponentName);
      updateGameState(fen);
      setStatus(`Game started - You are ${playerColor === 'w' ? 'White' : 'Black'}`);
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 });
      startTimer();
    });

    newSocket.on("moveMade", ({ fen, move, turn, timeLeft }) => {
      console.log("Move received:", move);
      updateGameState(fen, turn);
      playMoveSound(move);
      
      if (move.captured) {
        setCapturedPieces(prev => {
          const capturingColor = move.color === 'w' ? 'w' : 'b';
          return {
            ...prev,
            [capturingColor]: [...prev[capturingColor], move.captured]
          };
        });
      }

      setCurrentTurn(turn);
      setTimeLeft(timeLeft);
      setLastServerUpdate(Date.now());
    });

    newSocket.on("timeUpdate", (updatedTimeLeft) => {
      setTimeLeft(updatedTimeLeft);
    });

    newSocket.on("joinError", (error) => {
      alert(`Error joining game: ${error}`);
      setStatus("Error joining game");
    });

    newSocket.on("playerLeft", ({ message }) => {
      setStatus(`Game ended - ${message}`);
    });

    newSocket.on("gameOver", ({ fen, result }) => {
      updateGameState(fen);
      setStatus(`Game over - ${result}`);
    });

    newSocket.on("moveError", (error) => {
      alert(`Move error: ${error}`);
    });

    return () => {
      newSocket.close();
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    timerInterval.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const currentColor = currentTurn === 'w' ? 'white' : 'black';
        return {
          ...prevTime,
          [currentColor]: Math.max(0, prevTime[currentColor] - 1),
        };
      });
    }, 1000);
  }, [currentTurn]);

  useEffect(() => {
    if (gameCode && opponentName) {
      startTimer();
    }
  }, [gameCode, opponentName, startTimer]);

  const updateGameState = (newFen, newTurn) => {
    const newGame = new Chess(newFen);
    setGame(newGame);
    setFen(newFen);
  
    if (newTurn) {
      setCurrentTurn(newTurn);
    }
  };

  const createGame = useCallback(() => {
    if (socket) {
      socket.emit("createGame", { 
        colorPreference: selectedColor,
        gameType: selectedGameType.name,
        timeControl: selectedGameType.time
      });
      setShowCreateDialog(false);
    }
  }, [socket, selectedColor, selectedGameType]);

  const joinGame = useCallback(() => {
    if (socket && joinCode) {
      socket.emit("joinGame", joinCode.toUpperCase());
      setShowJoinDialog(false);
    }
  }, [socket, joinCode]);

  const handleMove = useCallback(
    (move) => {
      if (socket && gameCode && currentTurn === playerColor) { // Check if it's the player's turn
        socket.emit("makeMove", { gameCode, move });
  
        // Optimistically update the game state
        const newGame = new Chess(game.fen());
        const result = newGame.move(move);
        if (result) {
          // Check if a piece was captured
          if (result.captured) {
            setCapturedPieces(prev => {
              const capturingColor = playerColor; // Use the player's color
              const opponentColor = capturingColor === 'w' ? 'b' : 'w';
              return {
                ...prev,
                [capturingColor]: [...prev[capturingColor], result.captured], // Add captured piece to capturing player
                [opponentColor]: prev[opponentColor], // Ensure opponent's captured pieces remain unchanged
              };
            });
          }
  
          setGame(newGame);
          setFen(newGame.fen());
          setCurrentTurn(newGame.turn());
        }
      } else {
        console.log("Not your turn");
      }
    },
    [socket, gameCode, game, currentTurn, playerColor]
  );
  
  
  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      // Allow the first move for white, even if playerColor is not set yet
      if (currentTurn !== playerColor && (playerColor !== currentTurn || !playerColor)) {
        console.log("Not your turn");
        return false;
      }
  
      const moves = game.moves({
        square: sourceSquare,
        verbose: true
      });
  
      const move = moves.find(m => m.to === targetSquare);
      if (!move) return false;
  
      if (move.flags.includes('p')) {
        setPendingMove({ from: sourceSquare, to: targetSquare });
        setShowPromotionModal(true);
        return true;
      }
  
      handleMove({ from: sourceSquare, to: targetSquare });
      return true;
    },
    [game, handleMove, playerColor, currentTurn]
  );
  

  const handlePromotion = (pieceType) => {
    if (pendingMove) {
      handleMove({ ...pendingMove, promotion: pieceType });
      setShowPromotionModal(false);
      setPendingMove(null);
    }
  };

  return (
    <div className="chess-game-container">
    <div className="status-bar">
      <div className="game-status">{status}</div>
      {gameCode && <div className="game-code">Game Code: {gameCode}</div>}
    </div>
    
    <div className="game-layout">
      <UserTile
        name={playerColor === 'w' ? opponentName : playerName}
        capturedPieces={capturedPieces[playerColor === 'w' ? 'b' : 'w']}
        side="top"
        color={playerColor === 'w' ? 'Black' : 'White'}
        timeLeft={timeLeft[playerColor === 'w' ? 'black' : 'white']}
      />
      <Chessboard
        position={fen}
        onDrop={handleDrop}
        orientation={playerColor === 'b' ? 'black' : 'white'}
        draggable={true}
        width={500}
      />
      <UserTile
        name={playerColor === 'w' ? playerName : opponentName}
        capturedPieces={capturedPieces[playerColor === 'w' ? 'w' : 'b']}
        side="bottom"
        color={playerColor === 'w' ? 'White' : 'Black'}
        timeLeft={timeLeft[playerColor === 'w' ? 'white' : 'black']}
        />
    </div>

      {!gameCode && (
        <div className="game-setup">
          <div className="game-controls">
            <button onClick={() => setShowCreateDialog(true)} className="control-button">
              Create New Game
            </button>
            <button onClick={() => setShowJoinDialog(true)} className="control-button">
              Join Game
            </button>
          </div>
        </div>
      )}

      {showJoinDialog && (
        <div className="join-game-dialog">
          <h3>Join a Game</h3>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter game code"
          />
          <button onClick={joinGame} className="control-button">
            Join
          </button>
          <button onClick={() => setShowJoinDialog(false)} className="control-button">
            Cancel
          </button>
        </div>
      )}

      {showCreateDialog && (
        <div className="create-game-dialog">
          <h3>Create a Game</h3>
          <div>
            <label>Game Type:</label>
            <select 
              value={selectedGameType.name} 
              onChange={(e) => setSelectedGameType(gameTypes.find(type => type.name === e.target.value))}
            >
              {gameTypes.map(type => (
                <option key={type.name} value={type.name}>
                  {type.name} ({type.time} min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Color:</label>
            <select 
              value={selectedColor} 
              onChange={(e) => setSelectedColor(e.target.value)}
            >
              <option value="random">Random</option>
              <option value="w">White</option>
              <option value="b">Black</option>
            </select>
          </div>
          <button onClick={createGame} className="control-button">
            Create Game
          </button>
          <button onClick={() => setShowCreateDialog(false)} className="control-button">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ChessBoardComponent;