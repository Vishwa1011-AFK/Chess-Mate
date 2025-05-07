import React, { useState, useCallback, useEffect, useRef } from "react";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";
import io from "socket.io-client";
import UserTile from "./UserTile";
import PromotionModal from "./PromotionModal";
import soundManager, { playMoveSound } from "../utils/SoundManager";
import './ChessBoard.css';

const SOCKET_SERVER_URL = "https://chess-matebackend-production.up.railway.app";

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
  const [status, setStatus] = useState("Waiting for game...");
  const [currentTurn, setCurrentTurn] = useState("w");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [playerName, setPlayerName] = useState("You");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]);
  const [selectedColor, setSelectedColor] = useState("random");
  const [timeLeft, setTimeLeft] = useState({ white: 0, black: 0 });
  const timerInterval = useRef(null);
  const [isGameActive, setIsGameActive] = useState(false);

  const [selectedPiece, setSelectedPiece] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(newSocket);

    newSocket.on("connect", () => console.log("Connected to server"));
    newSocket.on("connect_error", (err) => console.error("Connection error:", err));

    newSocket.on("gameCreated", ({ gameCode, color, fen: serverFen, gameType, timeControl }) => {
      console.log("Game created:", gameCode, "as", color, "FEN:", serverFen, "Type:", gameType, "Time:", timeControl);
      setGameCode(gameCode);
      setPlayerColor(color);
      updateGameState(serverFen, 'w');
      setStatus(`Game created. Share code: ${gameCode}. Waiting for opponent...`);
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 });
      setIsGameActive(false);
    });

    newSocket.on("gameJoined", ({ gameCode: joinedGameCode, color, fen: serverFen, opponentName: oppName, timeControl, gameType }) => {
      console.log("Game joined:", joinedGameCode, "as", color, "Opponent:", oppName, "Time:", timeControl);
      setGameCode(joinedGameCode);
      setPlayerColor(color);
      setOpponentName(oppName || "Opponent");
      updateGameState(serverFen, 'w');
      setStatus(`Game started! You are ${color === 'w' ? 'White' : 'Black'}. Your turn: ${currentTurn === color}.`);
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 });
      setIsGameActive(true);
      if (currentTurn === color) startTimer();
    });

    newSocket.on("opponentJoined", ({ fen: serverFen, opponentName: oppName, timeControl, gameType }) => {
      console.log("Opponent joined:", oppName, "Time:", timeControl);
      setOpponentName(oppName || "Opponent");
      updateGameState(serverFen);
      setStatus(`Opponent joined! You are ${playerColor === 'w' ? 'White' : 'Black'}. Your turn: ${currentTurn === playerColor}.`);
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 });
      setIsGameActive(true);
      if (currentTurn === playerColor) startTimer();
    });

    newSocket.on("moveMade", ({ fen: serverFen, move, turn, timeLeft: serverTimeLeft }) => {
      console.log("Move received:", move, "Next turn:", turn, "TimeLeft:", serverTimeLeft);
      const localGame = new Chess(serverFen);
      setGame(localGame);
      setFen(serverFen);
      setCurrentTurn(turn);
      setTimeLeft(serverTimeLeft);
      playMoveSound(move);

      if (move.capturedPieceFull) {
        setCapturedPieces(prev => {
          const capturerColor = move.color;
          const newCaptured = { ...prev };
          newCaptured[capturerColor] = [...(newCaptured[capturerColor] || []), move.capturedPieceFull];
          return newCaptured;
        });
      }
      
      setSelectedPiece(null);
      setPossibleMoves([]);
      updateStatusMessage(localGame, playerColor, turn);
      if (turn === playerColor && !localGame.isGameOver()) {
        startTimer();
      } else {
        if (timerInterval.current) clearInterval(timerInterval.current);
      }
    });

    newSocket.on("timeUpdate", (updatedTimeLeft) => {
      setTimeLeft(updatedTimeLeft);
    });

    newSocket.on("joinError", (error) => {
      alert(`Error joining game: ${error}`);
      setStatus("Error joining game. Please try again.");
    });

    newSocket.on("playerLeft", ({ message }) => {
      console.log("Opponent left:", message);
      setStatus(message);
      setIsGameActive(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
      setSelectedPiece(null);
      setPossibleMoves([]);
    });

    newSocket.on("gameOver", ({ fen: finalFen, result }) => {
      console.log("Game Over:", result, "FEN:", finalFen);
      updateGameState(finalFen, null);
      setStatus(`Game over - ${result}`);
      setIsGameActive(false);
      if (timerInterval.current) clearInterval(timerInterval.current);
      setSelectedPiece(null);
      setPossibleMoves([]);
    });

    newSocket.on("moveError", (error) => {
      alert(`Move error: ${error}`);
    });

    return () => {
      newSocket.close();
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [playerColor]);

  const updateStatusMessage = (currentGame, localPlayerColor, currentTurnFromServer) => {
    if (currentGame.isGameOver()) {
        if (currentGame.isCheckmate()) setStatus(`Checkmate! ${currentTurnFromServer === 'w' ? 'Black' : 'White'} wins.`);
        else if (currentGame.isDraw()) setStatus('Draw!');
        else if (currentGame.isStalemate()) setStatus('Stalemate!');
        return;
    }
    const turnColorName = currentTurnFromServer === 'w' ? 'White' : 'Black';
    let message = `${turnColorName}'s turn.`;
    if (currentTurnFromServer === localPlayerColor) {
        message = "Your turn.";
    }
    if (currentGame.inCheck()) {
        message += ` ${turnColorName} is in Check!`;
    }
    setStatus(message);
  };


  const startTimer = useCallback(() => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    
    if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) {
        if (timerInterval.current) clearInterval(timerInterval.current);
        return;
    }

    timerInterval.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const colorToUpdate = currentTurn === 'w' ? 'white' : 'black';
        const newTimeForColor = Math.max(0, prevTime[colorToUpdate] - 1);
        
        if (newTimeForColor === 0) {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return { ...prevTime, [colorToUpdate]: newTimeForColor };
      });
    }, 1000);
  }, [currentTurn, playerColor, isGameActive, game]);

  useEffect(() => {
    if (isGameActive && currentTurn === playerColor && !game.isGameOver()) {
      startTimer();
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
    if(isGameActive) updateStatusMessage(game, playerColor, currentTurn);

  }, [currentTurn, playerColor, isGameActive, startTimer, game]);


  const updateGameState = (newFen, newTurn) => {
    const newGameInstance = new Chess(newFen);
    setGame(newGameInstance);
    setFen(newFen);
    if (newTurn !== undefined) {
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
    if (socket && joinCode.trim()) {
      socket.emit("joinGame", joinCode.trim().toUpperCase());
      setShowJoinDialog(false);
    } else {
      alert("Please enter a game code.");
    }
  }, [socket, joinCode]);

  const handleMove = useCallback(
    (moveAttempt) => {
      if (!socket || !gameCode || currentTurn !== playerColor || !isGameActive || game.isGameOver()) {
        console.log("Cannot make move:", { gameCode, currentTurn, playerColor, isGameActive, isGameOver: game.isGameOver() });
        return false;
      }

      const gameCopy = new Chess(fen);
      const legalMove = gameCopy.move(moveAttempt);

      if (legalMove) {
        socket.emit("makeMove", { gameCode, move: moveAttempt });
        setSelectedPiece(null);
        setPossibleMoves([]);
        if (timerInterval.current) clearInterval(timerInterval.current);
        return true;
      } else {
        console.log("Invalid move attempted:", moveAttempt);
        return false;
      }
    },
    [socket, gameCode, currentTurn, playerColor, fen, isGameActive, game]
  );

  const highlightSquareStyles = useCallback((squareToStyle) => {
    const highlightStyle = { background: "rgba(255, 255, 0, 0.4)" };
    let styles = {};
    if (selectedPiece) {
        styles[selectedPiece] = {
            boxShadow: "inset 0 0 3px 3px green"
        };
    }
    possibleMoves.forEach(moveSquare => {
        styles[moveSquare] = highlightStyle;
    });
    return styles;
  }, [selectedPiece, possibleMoves]);


  const onSquareClick = useCallback((square) => {
    if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) return;

    const pieceOnSquare = game.get(square);

    if (selectedPiece) {
      const move = {
        from: selectedPiece,
        to: square,
        promotion: 'q',
      };
      
      const tempGame = new Chess(fen);
      const isPromotion = tempGame.moves({ square: selectedPiece, verbose: true })
                               .some(m => m.to === square && m.flags.includes('p'));

      if (isPromotion) {
        setPendingPromotion({ from: selectedPiece, to: square });
        setShowPromotionModal(true);
      } else {
        const moveMade = handleMove(move);
        if (!moveMade) {
            if (pieceOnSquare && pieceOnSquare.color === playerColor) {
                setSelectedPiece(square);
                setPossibleMoves(game.moves({ square, verbose: true }).map(m => m.to));
            } else {
                setSelectedPiece(null);
                setPossibleMoves([]);
            }
        }
      }
    } else {
      if (pieceOnSquare && pieceOnSquare.color === playerColor) {
        setSelectedPiece(square);
        setPossibleMoves(game.moves({ square, verbose: true }).map(m => m.to));
      }
    }
  }, [isGameActive, currentTurn, playerColor, game, selectedPiece, handleMove, fen]);


  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) return false;

      const tempGame = new Chess(fen);
      const potentialMoves = tempGame.moves({ square: sourceSquare, verbose: true });
      const moveDetails = potentialMoves.find(m => m.to === targetSquare);

      if (!moveDetails) return false;

      if (moveDetails.flags.includes('p')) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        setShowPromotionModal(true);
        setSelectedPiece(null); 
        setPossibleMoves([]);
        return true;
      }
      
      handleMove({ from: sourceSquare, to: targetSquare });
      return true;
    },
    [isGameActive, currentTurn, playerColor, game, handleMove, fen]
  );


  const handlePromotion = useCallback((pieceType) => {
    if (pendingPromotion) {
      handleMove({ ...pendingPromotion, promotion: pieceType });
      setShowPromotionModal(false);
      setPendingPromotion(null);
    }
  }, [pendingPromotion, handleMove]);

  const boardDisabled = !isGameActive || currentTurn !== playerColor || game.isGameOver();

  return (
    <div className="chess-game-container">
      <div className="status-bar">
        <div className="game-status">{status}</div>
        {gameCode && <div className="game-code">Game Code: <strong>{gameCode}</strong></div>}
      </div>
      
      <div className="game-layout">
        <UserTile
          name={playerColor === 'w' ? opponentName : playerName}
          capturedPieces={capturedPieces[playerColor === 'w' ? 'b' : 'w'] || []}
          side="top"
          color={playerColor === 'w' ? 'Black' : 'White'}
          timeLeft={timeLeft[playerColor === 'w' ? 'black' : 'white']}
        />
        <div className="chessboard-container">
            <Chessboard
            position={fen}
            onDrop={handleDrop}
            orientation={playerColor === 'b' ? 'black' : 'white'}
            draggable={!boardDisabled}
            width={Math.min(500, window.innerWidth - 40)}
            onSquareClick={onSquareClick}
            squareStyles={highlightSquareStyles()}
            />
        </div>
        <UserTile
          name={playerColor === 'w' ? playerName : opponentName}
          capturedPieces={capturedPieces[playerColor === 'w' ? 'w' : 'b'] || []}
          side="bottom"
          color={playerColor === 'w' ? 'White' : 'Black'}
          timeLeft={timeLeft[playerColor === 'w' ? 'white' : 'black']}
        />
      </div>

      {showPromotionModal && (
        <PromotionModal
          onClose={() => {
            setShowPromotionModal(false);
            setPendingPromotion(null);
            setSelectedPiece(null);
            setPossibleMoves([]);
          }}
          onPromotion={handlePromotion}
          color={playerColor}
        />
      )}
      
      {!gameCode && !isGameActive && (
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
        <div className="join-dialog">
          <h3>Join a Game</h3>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter game code"
            maxLength="6"
            style={{textTransform: "uppercase"}}
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
        <div className="create-dialog">
          <h3>Create a Game</h3>
          <div>
            <label htmlFor="gameTypeSelect">Game Type:</label>
            <select 
              id="gameTypeSelect"
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
            <label htmlFor="colorSelect">Your Color:</label>
            <select 
              id="colorSelect"
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