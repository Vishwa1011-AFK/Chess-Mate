import React, { useState, useCallback, useEffect, useRef } from "react";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";
import io from "socket.io-client";
import UserTile from "./UserTile";
import PromotionModal from "./PromotionModal";
import soundManager, { playMoveSound } from "../utils/SoundManager";
import './ChessBoard.css';

const SOCKET_SERVER_URL = "https://chess-mate-backend-3fq5.onrender.com/";

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
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());
  const [playerName, setPlayerName] = useState("You");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]);
  const [selectedColor, setSelectedColor] = useState("random");
  const [timeLeft, setTimeLeft] = useState({ white: 0, black: 0 });
  const timerInterval = useRef(null);

  // New state for piece selection and possible moves
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

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
      
      // Reset selection and possible moves after a move is made
      setSelectedPiece(null);
      setPossibleMoves([]);
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
      if (socket && gameCode && currentTurn === playerColor) {
        socket.emit("makeMove", { gameCode, move });
  
        // Optimistically update the game state
        const newGame = new Chess(game.fen());
        const result = newGame.move(move);
        if (result) {
          if (result.captured) {
            setCapturedPieces(prev => {
              const capturingColor = playerColor;
              const opponentColor = capturingColor === 'w' ? 'b' : 'w';
              return {
                ...prev,
                [capturingColor]: [...prev[capturingColor], result.captured],
                [opponentColor]: prev[opponentColor],
              };
            });
          }
  
          setGame(newGame);
          setFen(newGame.fen());
          setCurrentTurn(newGame.turn());
          
          // Reset selection and possible moves after a move is made
          setSelectedPiece(null);
          setPossibleMoves([]);
        }
      } else {
        console.log("Not your turn");
      }
    },
    [socket, gameCode, game, currentTurn, playerColor]
  );

  const highlightSquare = useCallback((square) => {
    return {
      backgroundColor: "rgba(255, 255, 0, 0.4)",
    };
  }, []);

  const onSquareClick = useCallback((square) => {
    if (currentTurn !== playerColor) {
      console.log("Not your turn");
      return;
    }

    if (selectedPiece) {
      // If a piece is already selected, try to move it
      const move = {
        from: selectedPiece,
        to: square,
        promotion: 'q', // always promote to queen for simplicity
      };

      const moveResult = game.move(move);
      if (moveResult) {
        // Valid move
        handleMove(move);
        setSelectedPiece(null);
        setPossibleMoves([]);
      } else {
        // Invalid move, check if it's a new piece selection
        const piece = game.get(square);
        if (piece && piece.color === playerColor[0]) {
          setSelectedPiece(square);
          const moves = game.moves({ square: square, verbose: true });
          setPossibleMoves(moves.map(move => move.to));
        } else {
          setSelectedPiece(null);
          setPossibleMoves([]);
        }
      }
    } else {
      // No piece selected, try to select one
      const piece = game.get(square);
      if (piece && piece.color === playerColor[0]) {
        setSelectedPiece(square);
        const moves = game.moves({ square: square, verbose: true });
        setPossibleMoves(moves.map(move => move.to));
      }
    }
  }, [game, selectedPiece, handleMove, currentTurn, playerColor]);

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (currentTurn !== playerColor) {
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
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        setShowPromotionModal(true);
        return true;
      }

      handleMove({ from: sourceSquare, to: targetSquare });
      return true;
    },
    [game, handleMove, playerColor, currentTurn]
  );

  const handlePromotion = useCallback((pieceType) => {
    if (pendingPromotion) {
      handleMove({ ...pendingPromotion, promotion: pieceType });
      setShowPromotionModal(false);
      setPendingPromotion(null);
    }
  }, [pendingPromotion, handleMove]);

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
          onSquareClick={onSquareClick}
          squareStyles={
            possibleMoves.reduce((styles, square) => {
              styles[square] = highlightSquare(square);
              return styles;
            }, {})
          }
        />
        <UserTile
          name={playerColor === 'w' ? playerName : opponentName}
          capturedPieces={capturedPieces[playerColor === 'w' ? 'w' : 'b']}
          side="bottom"
          color={playerColor === 'w' ? 'White' : 'Black'}
          timeLeft={timeLeft[playerColor === 'w' ? 'white' : 'black']}
        />
      </div>

      {showPromotionModal && (
        <PromotionModal
          onClose={() => setShowPromotionModal(false)}
          onPromotion={handlePromotion}
          color={playerColor}
        />
      )}
      
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