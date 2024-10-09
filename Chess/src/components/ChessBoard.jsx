import React, { useState, useCallback, useEffect, useRef } from "react";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";
import io from "socket.io-client";
import UserTile from "./UserTile";
import PromotionModal from "./PromotionModal";
import soundManager, { playMoveSound } from "../utils/SoundManager";
import './ChessBoard.css';

const SOCKET_SERVER_URL = "http://localhost:3001";
const INITIAL_TIME = 10 * 60; // 10 minutes in seconds

const ChessBoardComponent = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("start");
  const [gameCode, setGameCode] = useState(null);
  const [socket, setSocket] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState("Opponent");
  const [status, setStatus] = useState("Waiting for game");
  const [turn, setTurn] = useState("w");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);
  const timerRef = useRef(null);

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
      updateGameState(fen);
      setStatus(`Game created. Share code: ${gameCode}`);
    });

    newSocket.on("gameJoined", ({ gameCode, color, fen }) => {
      console.log("Game joined:", gameCode);
      setGameCode(gameCode);
      setPlayerColor(color);
      updateGameState(fen);
      setStatus(`Game started - You are ${color === 'w' ? 'White' : 'Black'}`);
      startTimer();
    });

    newSocket.on("opponentJoined", ({ color, fen }) => {
      console.log("Opponent joined");
      updateGameState(fen);
      setStatus(`Game started - You are ${playerColor === 'w' ? 'White' : 'Black'}`);
      startTimer();
    });

    newSocket.on("moveMade", ({ fen, move, turn }) => {
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
      
      requestAnimationFrame(() => {
        const newGame = new Chess(fen);
        setGame(newGame);
        setFen(fen);
      });
    });

    newSocket.on("joinError", (error) => {
      alert(`Error joining game: ${error}`);
      setStatus("Error joining game");
    });

    newSocket.on("playerLeft", ({ message }) => {
      setStatus(`Game ended - ${message}`);
      stopTimer();
    });

    newSocket.on("gameOver", ({ fen, result }) => {
      updateGameState(fen);
      setStatus(`Game over - ${result}`);
      stopTimer();
    });

    newSocket.on("moveError", (error) => {
      alert(`Move error: ${error}`);
    });

    return () => {
      newSocket.close();
      stopTimer();
    };
  }, []);

  const updateGameState = (newFen, newTurn) => {
    const newGame = new Chess(newFen);
    setGame(newGame);
    setFen(newFen);
    if (newTurn) setTurn(newTurn);
  };

  const createGame = useCallback(() => {
    if (socket) {
      socket.emit("createGame");
    }
  }, [socket]);

  const joinGame = useCallback(() => {
    if (socket && joinCode) {
      socket.emit("joinGame", joinCode.toUpperCase());
      setShowJoinDialog(false);
    }
  }, [socket, joinCode]);

  const handleMove = useCallback(
    (move) => {
      if (socket && gameCode) {
        socket.emit("makeMove", { gameCode, move });
      }
    },
    [socket, gameCode]
  );

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (playerColor !== turn) {
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
    [game, handleMove, playerColor, turn]
  );

  const handlePromotion = (pieceType) => {
    if (pendingMove) {
      handleMove({ ...pendingMove, promotion: pieceType });
      setShowPromotionModal(false);
      setPendingMove(null);
    }
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(prev => Math.max(0, prev - 1));
      } else {
        setBlackTime(prev => Math.max(0, prev - 1));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
          name={playerColor === 'b' ? "You" : opponentName}
          timeLeft={playerColor === 'b' ? blackTime : whiteTime}
          capturedPieces={capturedPieces[playerColor === 'b' ? 'w' : 'b']}
          side="top"
        />
        <Chessboard
          position={fen}
          onDrop={handleDrop}
          orientation={playerColor === 'b' ? 'black' : 'white'}
          boardStyle={{
            borderRadius: "5px",
            boxShadow: `0 5px 15px rgba(0, 0, 0, 0.5)`
          }}
        />
        <UserTile
          name={playerColor === 'w' ? "You" : opponentName}
          timeLeft={playerColor === 'w' ? whiteTime : blackTime}
          capturedPieces={capturedPieces[playerColor === 'w' ? 'b' : 'w']}
          side="bottom"
        />
      </div>
      
      <div className="game-controls">
        {!gameCode && (
          <>
            <button onClick={createGame} className="control-button">
              Create New Game
            </button>
            <button onClick={() => setShowJoinDialog(true)} className="control-button">
              Join Game
            </button>
          </>
        )}
      </div>

      {showJoinDialog && (
        <div className="join-dialog">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter game code"
            maxLength={6}
          />
          <button onClick={joinGame}>Join</button>
          <button onClick={() => setShowJoinDialog(false)}>Cancel</button>
        </div>
      )}

      {showPromotionModal && (
        <PromotionModal
          onSelectPiece={handlePromotion}
          color={playerColor}
        />
      )}
    </div>
  );
};

export default ChessBoardComponent;