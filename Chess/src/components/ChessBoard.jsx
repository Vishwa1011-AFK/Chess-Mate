import React, { useState, useCallback, useEffect } from "react";
import Chessboard from "chessboardjsx";
import { Chess } from "chess.js";
import soundManager from '../utils/SoundManager';
import soundSelfMove from '../assets/sounds/self-move.mp3';
import soundCapture from '../assets/sounds/capture.mp3';
import soundCastling from '../assets/sounds/castling.mp3';
import soundMoveCheck from '../assets/sounds/move-check.mp3';
import soundPromotion from '../assets/sounds/promotion.mp3';
import './ChessBoard.css';
import PromotionModal from './PromotionModal';
import CapturedPieces from './CapturedPieces';

const sounds = [
  { name: "selfMove", file: soundSelfMove },
  { name: "capture", file: soundCapture },
  { name: "castling", file: soundCastling },
  { name: "moveCheck", file: soundMoveCheck },
  { name: "promotion", file: soundPromotion },
];

// Helper function to format time in MM:SS
const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const UserTile = ({ name, timeLeft, capturedPieces, side }) => {
  return (
    <div className={`user-tile ${side}`}>
      <div className="user-name">{name}</div>
      <div className="user-captured">
        <CapturedPieces capturedPieces={capturedPieces} side={side} />
      </div>
      <div className="user-timer">{formatTime(timeLeft)}</div> {/* Format time here */}
    </div>
  );
};

const ChessBoardComponent = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("start");
  const [promotionPiece, setPromotionPiece] = useState(null);
  const [isPromotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [timerWhite, setTimerWhite] = useState(600); // 10 minutes in seconds
  const [timerBlack, setTimerBlack] = useState(600);
  const [turn, setTurn] = useState("w"); // Track whose turn it is

  useEffect(() => {
    soundManager.preloadSounds(sounds);

    const interval = setInterval(() => {
      if (!game.isGameOver()) {
        if (turn === "w") {
          setTimerWhite((prev) => Math.max(prev - 1, 0));
        } else {
          setTimerBlack((prev) => Math.max(prev - 1, 0));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [turn, game]);

  const isGameOver = useCallback((chessInstance) => {
    return chessInstance.isGameOver() || chessInstance.isDraw() || chessInstance.isCheckmate();
  }, []);

  const playMoveSound = (move) => {
    if (move.captured) {
      soundManager.playSound("capture");
    } else {
      soundManager.playSound("selfMove");
    }

    if (move.flags.includes('k')) {
      soundManager.playSound("castling");
    }

    if (game.inCheck()) {
      soundManager.playSound("moveCheck");
    }
  };

  // Fix captured pieces logic here
  const updateCapturedPieces = (move) => {
    if (move.captured) {
      setCapturedPieces((prev) => {
        const capturingSide = move.color === 'w' ? 'w' : 'b'; // Corrected logic: 'w' captures add to 'w' and 'b' captures add to 'b'
        const capturedPiece = move.color === 'w' ? move.captured.toLowerCase() : move.captured.toUpperCase(); // Captured piece should be added in correct case
        return {
          ...prev,
          [capturingSide]: [...prev[capturingSide], capturedPiece],
        };
      });
    }
  };

  const handleMove = useCallback((newMove) => {
    if (newMove) {
      playMoveSound(newMove);
      updateCapturedPieces(newMove);
      setFen(game.fen());
      setGame(new Chess(game.fen()));
      setTurn(turn === "w" ? "b" : "w");

      if (isGameOver(game)) {
        alert("Game Over");
      }
    }
  }, [game, turn, isGameOver]);

  const handleDrop = useCallback(({ sourceSquare, targetSquare }) => {
    const moves = game.moves({ square: sourceSquare, verbose: true });

    if (!moves.some((legalMove) => legalMove.to === targetSquare)) {
      console.log("Invalid move:", { from: sourceSquare, to: targetSquare });
      return false;
    }

    const newMove = game.move({
      from: sourceSquare,
      to: targetSquare,
    });

    if (newMove) {
      if (newMove.flags.includes('p')) {
        setPromotionPiece({ from: sourceSquare, to: targetSquare });
        setPromotionModalOpen(true);
        return;
      }

      handleMove(newMove);
    }

    setHighlightedSquares([]);
    setSelectedSquare(null);
    return true;
  }, [game, handleMove]);

  const handleSquareClick = useCallback((square) => {
    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece) {
        const moves = game.moves({ square, verbose: true });
        const legalMoves = moves.map(move => move.to);
        setHighlightedSquares(legalMoves);
        setSelectedSquare(square);
      }
    } else {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      if (moves.some(move => move.to === square)) {
        const newMove = game.move({
          from: selectedSquare,
          to: square,
        });

        if (newMove) {
          if (newMove.flags.includes('p')) {
            setPromotionPiece({ from: selectedSquare, to: square });
            setPromotionModalOpen(true);
            return;
          }

          handleMove(newMove);
        }
      }
      setHighlightedSquares([]);
      setSelectedSquare(null);
    }
  }, [selectedSquare, game, handleMove]);

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setFen("start");
    setHighlightedSquares([]);
    setSelectedSquare(null);
    setCapturedPieces({ w: [], b: [] });
    setTimerWhite(600);
    setTimerBlack(600);
    setTurn("w");
  }, []);

  return (
    <div className="chessboard-wrapper">
      <UserTile 
        name="Opponent" 
        timeLeft={timerBlack} 
        capturedPieces={capturedPieces.b} // Corrected: captured by black shown on white side
        side="black" 
      />
      <div className="chessboard-container">
        <Chessboard
          position={fen}
          onDrop={handleDrop}
          onSquareClick={handleSquareClick}
          draggable={true}
          width={550}
          squareStyles={{
            ...(highlightedSquares.reduce((acc, square) => {
              acc[square] = { backgroundColor: 'yellow' };
              return acc;
            }, {})),
          }}
        />
        <button onClick={resetGame} style={{ marginTop: "10px" }}>
          Reset Game
        </button>
      </div>
      <UserTile 
        name="Guest9330695513" 
        timeLeft={timerWhite} 
        capturedPieces={capturedPieces.w} // Corrected: captured by white shown on black side
        side="white" 
      />
      {isPromotionModalOpen && (
        <PromotionModal onClose={() => setPromotionModalOpen(false)} onPromote={handlePromotion} />
      )}
    </div>
  );
};

export default ChessBoardComponent;
