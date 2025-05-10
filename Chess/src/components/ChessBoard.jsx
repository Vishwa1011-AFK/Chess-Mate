"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Chessboard from "chessboardjsx"
import { Chess } from "chess.js"
import io from "socket.io-client"
import UserTile from "./UserTile"
import PromotionModal from "./PromotionModal"
import { playMoveSound } from "../utils/SoundManager"
import "./ChessBoard.css"

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL || "https://chess-matebackend-production.up.railway.app"

const gameTypes = [
  { name: "Blitz", time: 3 },
  { name: "Speed", time: 5 },
  { name: "Classic", time: 10 },
  { name: "Long", time: 30 },
]

const ChessBoardComponent = () => {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState("start")
  const [gameCode, setGameCode] = useState(null)
  const [socket, setSocket] = useState(null)
  const [playerColor, setPlayerColor] = useState(null)
  const [opponentName, setOpponentName] = useState("Opponent")
  const [status, setStatus] = useState("Connect or Create a Game")
  const [currentTurn, setCurrentTurn] = useState("w")
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] })
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [pendingPromotion, setPendingPromotion] = useState(null)
  const [playerName, setPlayerName] = useState("You")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0])
  const [selectedColor, setSelectedColor] = useState("random")
  const [timeLeft, setTimeLeft] = useState({ white: 0, black: 0 })
  const timerInterval = useRef(null)
  const [isGameActive, setIsGameActive] = useState(false)
  const [showCopyTooltip, setShowCopyTooltip] = useState(false)

  const [selectedPiece, setSelectedPiece] = useState(null)
  const [possibleMoves, setPossibleMoves] = useState([])
  const [statusClass, setStatusClass] = useState("")

  useEffect(() => {
    console.log("Attempting to connect to server:", SOCKET_SERVER_URL)
    const newSocket = io(SOCKET_SERVER_URL, {
      withCredentials: true,
      transports: ["websocket"],
    })
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("[CLIENT] Connected to server with socket ID:", newSocket.id)
      setStatus("Connected. Create or Join a Game.")
      setStatusClass("")
    })
    newSocket.on("connect_error", (err) => {
      console.error("[CLIENT] Connection error:", err.message, err.stack)
      setStatus(`Connection Error: ${err.message}`)
      setStatusClass("error")
    })
    newSocket.on("disconnect", (reason) => {
      console.log(`[CLIENT] Disconnected from server: ${reason}`)
      setStatus("Disconnected. Please refresh.")
      setStatusClass("error")
      setIsGameActive(false)
      if (timerInterval.current) clearInterval(timerInterval.current)
    })

    newSocket.on("gameCreated", ({ gameCode, color, fen: serverFen, gameType, timeControl }) => {
      console.log("[CLIENT] Received gameCreated event:", { gameCode, color, serverFen, gameType, timeControl })
      setGameCode(gameCode)
      setPlayerColor(color)
      updateGameState(serverFen, "w")
      setStatus(`Game created. Share code: ${gameCode}. Waiting for opponent...`)
      setStatusClass("")
      setTimeLeft({ white: timeControl * 60, black: timeControl * 60 })
      setIsGameActive(false)
      console.log("[CLIENT] State after gameCreated:", { gameCode, playerColor, fen: serverFen, isGameActive: false })
    })

    newSocket.on(
      "gameJoined",
      ({
        gameCode: joinedGameCode,
        color,
        fen: serverFen,
        opponentName: oppName,
        timeControl,
        gameType,
        timeLeft: serverTimeLeft,
      }) => {
        console.log("[CLIENT] Received gameJoined event:", {
          joinedGameCode,
          color,
          serverFen,
          oppName,
          timeControl,
          gameType,
          serverTimeLeft,
        })
        setGameCode(joinedGameCode)
        setPlayerColor(color)
        setOpponentName(oppName || "Opponent")
        updateGameState(serverFen, "w")
        setTimeLeft(serverTimeLeft || { white: timeControl * 60, black: timeControl * 60 })
        setIsGameActive(true)
        setStatusClass("")
        console.log("[CLIENT] State after gameJoined:", {
          gameCode: joinedGameCode,
          playerColor: color,
          fen: serverFen,
          isGameActive: true,
          timeLeft: serverTimeLeft,
        })
      },
    )

    newSocket.on(
      "opponentJoined",
      ({ fen: serverFen, opponentName: oppName, timeLeft: serverTimeLeft, timeControl, gameType }) => {
        console.log("[CLIENT] Received opponentJoined event:", {
          serverFen,
          oppName,
          serverTimeLeft,
          timeControl,
          gameType,
        })
        setOpponentName(oppName || "Opponent")
        updateGameState(serverFen)
        setTimeLeft(serverTimeLeft || { white: timeControl * 60, black: timeControl * 60 })
        setIsGameActive(true)
        setStatusClass("")
        console.log("[CLIENT] State after opponentJoined:", {
          fen: serverFen,
          opponentName,
          isGameActive: true,
          timeLeft: serverTimeLeft,
        })
      },
    )

    newSocket.on("moveMade", ({ fen: serverFen, move, turn, timeLeft: serverTimeLeft }) => {
      console.log("[CLIENT] Received moveMade event:", { serverFen, move, turn, serverTimeLeft })
      const localGame = new Chess(serverFen)
      setGame(localGame)
      setFen(serverFen)
      setCurrentTurn(turn)
      setTimeLeft(serverTimeLeft)
      playMoveSound(move)

      if (move.captured) {
        const capturedPieceFull = (move.color === "w" ? "b" : "w") + move.captured.toUpperCase()
        setCapturedPieces((prev) => {
          const capturerColor = move.color
          const newCaptured = { ...prev }
          newCaptured[capturerColor] = [...(newCaptured[capturerColor] || []), capturedPieceFull]
          return newCaptured
        })
      }

      setSelectedPiece(null)
      setPossibleMoves([])

      // Check if the move puts the opponent in check
      if (localGame.inCheck()) {
        setStatusClass("check")
      } else {
        setStatusClass("")
      }
    })

    newSocket.on("timeUpdate", (updatedTimeLeft) => {
      setTimeLeft(updatedTimeLeft)
      if (updatedTimeLeft.white <= 0 || updatedTimeLeft.black <= 0) {
        console.log("[CLIENT] Time ran out based on update, potentially game over.")
      }
    })

    newSocket.on("joinError", (error) => {
      console.error(`[CLIENT] Received joinError: ${error}`)
      alert(`Error joining game: ${error}`)
      setStatus("Error joining game. Please try again.")
      setStatusClass("error")
    })

    newSocket.on("playerLeft", ({ message }) => {
      console.log("[CLIENT] Received playerLeft:", message)
      setStatus(message)
      setStatusClass("error")
      setIsGameActive(false)
      if (timerInterval.current) clearInterval(timerInterval.current)
      setSelectedPiece(null)
      setPossibleMoves([])
    })

    newSocket.on("gameOver", ({ fen: finalFen, result }) => {
      console.log("[CLIENT] Received gameOver:", { finalFen, result })
      updateGameState(finalFen, null)
      setStatus(`Game over - ${result}`)
      setStatusClass(result.toLowerCase().includes("checkmate") ? "checkmate" : "draw")
      setIsGameActive(false)
      if (timerInterval.current) clearInterval(timerInterval.current)
      setSelectedPiece(null)
      setPossibleMoves([])
    })

    newSocket.on("moveError", (error) => {
      console.error(`[CLIENT] Received moveError: ${error}`)
      alert(`Move error: ${error}`)
    })

    return () => {
      console.log("[CLIENT] Cleaning up socket connection.")
      newSocket.close()
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [])

  const updateStatusMessage = useCallback(
    (currentGame, localPlayerColor, currentTurnFromServer) => {
      if (!isGameActive) return

      let statusMessage = ""
      let newStatusClass = ""

      if (currentGame.isGameOver()) {
        setIsGameActive(false)
        if (timerInterval.current) clearInterval(timerInterval.current)

        if (currentGame.isCheckmate()) {
          statusMessage = `Checkmate! ${currentTurnFromServer === "w" ? "Black" : "White"} wins.`
          newStatusClass = "checkmate"
        } else if (currentGame.isDraw()) {
          statusMessage = "Draw!"
          newStatusClass = "draw"
          if (currentGame.isStalemate()) statusMessage = "Draw: Stalemate!"
          if (currentGame.isThreefoldRepetition()) statusMessage = "Draw: Threefold Repetition!"
          if (currentGame.isInsufficientMaterial()) statusMessage = "Draw: Insufficient Material!"
        } else if (timeLeft.white <= 0) {
          statusMessage = "Game Over: Black wins on time."
          newStatusClass = "checkmate"
        } else if (timeLeft.black <= 0) {
          statusMessage = "Game Over: White wins on time."
          newStatusClass = "checkmate"
        } else {
          statusMessage = "Game Over."
          newStatusClass = "draw"
        }
      } else {
        const turnColorName = currentTurnFromServer === "w" ? "White" : "Black"
        if (currentTurnFromServer === localPlayerColor) {
          statusMessage = "Your turn"
        } else {
          statusMessage = `${turnColorName}'s turn`
        }

        if (currentGame.inCheck()) {
          statusMessage += ` (${turnColorName} is in Check!)`
          newStatusClass = "check"
        }
      }

      setStatus(statusMessage)
      setStatusClass(newStatusClass)
    },
    [isGameActive, playerColor, timeLeft],
  )

  const startTimer = useCallback(() => {
    if (timerInterval.current) clearInterval(timerInterval.current)

    if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) {
      return
    }

    console.log(`[CLIENT TIMER] Starting timer for ${playerColor === "w" ? "White" : "Black"}`)
    timerInterval.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        const colorToUpdate = currentTurn === "w" ? "white" : "black"
        const newTimeForColor = Math.max(0, prevTime[colorToUpdate] - 1)

        if (newTimeForColor === 0) {
          console.log(`[CLIENT TIMER] Timer reached zero for ${colorToUpdate}`)
          if (timerInterval.current) clearInterval(timerInterval.current)
        }
        return { ...prevTime, [colorToUpdate]: newTimeForColor }
      })
    }, 1000)
  }, [currentTurn, playerColor, isGameActive, game])

  useEffect(() => {
    updateStatusMessage(game, playerColor, currentTurn)

    if (isGameActive) {
      startTimer()
    } else {
      if (timerInterval.current) {
        console.log("[CLIENT TIMER] Clearing timer because game is not active.")
        clearInterval(timerInterval.current)
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [currentTurn, playerColor, isGameActive, game, updateStatusMessage, startTimer])

  const updateGameState = (newFen, newTurn) => {
    try {
      const newGameInstance = new Chess(newFen)
      setGame(newGameInstance)
      setFen(newFen)
      setCurrentTurn(newTurn !== undefined ? newTurn : newGameInstance.turn())
      console.log(`[CLIENT] Updated game state. FEN: ${newFen}, Turn: ${newGameInstance.turn()}`)
    } catch (error) {
      console.error("[CLIENT] Error updating game state with FEN:", newFen, error)
    }
  }

  const createGame = useCallback(() => {
    if (socket) {
      console.log("[CLIENT] Emitting createGame:", {
        colorPreference: selectedColor,
        gameType: selectedGameType.name,
        timeControl: selectedGameType.time,
      })
      socket.emit("createGame", {
        colorPreference: selectedColor,
        gameType: selectedGameType.name,
        timeControl: selectedGameType.time,
      })
      setShowCreateDialog(false)
    } else {
      console.error("[CLIENT] Cannot create game, socket not connected.")
    }
  }, [socket, selectedColor, selectedGameType])

  const joinGame = useCallback(() => {
    const codeToJoin = joinCode.trim().toUpperCase()
    if (socket && codeToJoin) {
      console.log("[CLIENT] Attempting to join game with code:", codeToJoin)
      socket.emit("joinGame", codeToJoin)
      setShowJoinDialog(false)
      setJoinCode("")
    } else if (!socket) {
      console.error("[CLIENT] Cannot join game, socket not connected.")
      alert("Not connected to server.")
    } else {
      alert("Please enter a valid game code.")
    }
  }, [socket, joinCode])

  const handleMove = useCallback(
    (moveAttempt) => {
      console.log("[CLIENT] handleMove called with:", moveAttempt)
      if (!socket || !gameCode || currentTurn !== playerColor || !isGameActive || game.isGameOver()) {
        console.warn("[CLIENT] Cannot make move. Conditions:", {
          gameCode: !!gameCode,
          isMyTurn: currentTurn === playerColor,
          isGameActive,
          isGameOver: game.isGameOver(),
          socketConnected: !!socket,
        })
        return false
      }

      const gameCopy = new Chess(fen)
      let legalMove
      try {
        legalMove = gameCopy.move(moveAttempt)
      } catch (e) {
        console.error("[CLIENT] Error during move attempt:", e)
        return false
      }

      if (legalMove) {
        console.log("[CLIENT] Move is legal, emitting 'makeMove':", { gameCode, move: moveAttempt })
        socket.emit("makeMove", { gameCode, move: moveAttempt })

        setSelectedPiece(null)
        setPossibleMoves([])
        if (timerInterval.current) clearInterval(timerInterval.current)
        return true
      } else {
        console.warn("[CLIENT] Illegal move attempted:", moveAttempt)
        setSelectedPiece(null)
        setPossibleMoves([])
        return false
      }
    },
    [socket, gameCode, currentTurn, playerColor, fen, isGameActive, game],
  )

  const highlightSquareStyles = useCallback(() => {
    const styles = {}

    // Highlight selected piece
    if (selectedPiece) {
      styles[selectedPiece] = {
        background: "rgba(105, 170, 105, 0.4)",
        boxShadow: "inset 0 0 5px 3px rgba(105, 170, 105, 0.7)",
      }
    }

    // Highlight possible moves
    possibleMoves.forEach((moveSquare) => {
      // Check if this is a capture move
      const pieceOnTarget = game.get(moveSquare)

      if (pieceOnTarget) {
        // Capture move - highlight in red
        styles[moveSquare] = {
          background: "rgba(220, 76, 76, 0.4)",
          boxShadow: "inset 0 0 5px 3px rgba(220, 76, 76, 0.7)",
        }
      } else {
        // Regular move - highlight in yellow
        styles[moveSquare] = {
          background: "rgba(243, 156, 18, 0.4)",
          boxShadow: "inset 0 0 5px 3px rgba(243, 156, 18, 0.3)",
        }
      }
    })

    return styles
  }, [selectedPiece, possibleMoves, game])

  const onSquareClick = useCallback(
    (square) => {
      console.log(`[CLIENT] Square clicked: ${square}. Selected piece: ${selectedPiece}`)
      if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) {
        console.log("[CLIENT] Click ignored: Game not active or not player's turn.")
        return
      }

      const pieceOnSquare = game.get(square)

      if (selectedPiece) {
        const move = {
          from: selectedPiece,
          to: square,
          promotion: "q",
        }

        const tempGame = new Chess(fen)
        const isPromotion = tempGame
          .moves({ square: selectedPiece, verbose: true })
          .some((m) => m.to === square && m.flags.includes("p"))

        if (isPromotion) {
          console.log(`[CLIENT] Promotion detected for move ${selectedPiece}-${square}`)
          setPendingPromotion({ from: selectedPiece, to: square })
          setShowPromotionModal(true)
        } else {
          const moveMade = handleMove(move)
          if (!moveMade) {
            if (pieceOnSquare && pieceOnSquare.color === playerColor) {
              console.log(`[CLIENT] Invalid move to ${square}. Switching selection to ${square}.`)
              setSelectedPiece(square)
              setPossibleMoves(game.moves({ square, verbose: true }).map((m) => m.to))
            } else {
              console.log(`[CLIENT] Invalid move target ${square}. Deselecting piece.`)
              setSelectedPiece(null)
              setPossibleMoves([])
            }
          }
        }
      } else {
        if (pieceOnSquare && pieceOnSquare.color === playerColor) {
          console.log(`[CLIENT] Selecting piece on ${square}`)
          setSelectedPiece(square)
          setPossibleMoves(game.moves({ square, verbose: true }).map((m) => m.to))
        } else {
          console.log(`[CLIENT] Clicked on empty or opponent square ${square} with no piece selected. Doing nothing.`)
          setSelectedPiece(null)
          setPossibleMoves([])
        }
      }
    },
    [isGameActive, currentTurn, playerColor, game, selectedPiece, handleMove, fen],
  )

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      console.log(`[CLIENT] Piece dropped: ${sourceSquare} -> ${targetSquare}`)
      if (!isGameActive || currentTurn !== playerColor || game.isGameOver()) {
        console.log("[CLIENT] Drop ignored: Game not active or not player's turn.")
        return false
      }

      const tempGame = new Chess(fen)
      const potentialMoves = tempGame.moves({ square: sourceSquare, verbose: true })
      const moveDetails = potentialMoves.find((m) => m.to === targetSquare)

      if (!moveDetails) {
        console.warn(`[CLIENT] Invalid drop target: ${targetSquare} from ${sourceSquare}`)
        return false
      }

      if (moveDetails.flags.includes("p")) {
        console.log(`[CLIENT] Promotion detected on drop ${sourceSquare}-${targetSquare}`)
        setPendingPromotion({ from: sourceSquare, to: targetSquare })
        setShowPromotionModal(true)
        setSelectedPiece(null)
        setPossibleMoves([])
        return true
      }

      const moveMade = handleMove({ from: sourceSquare, to: targetSquare })
      return moveMade
    },
    [isGameActive, currentTurn, playerColor, game, handleMove, fen],
  )

  const handlePromotion = useCallback(
    (pieceType) => {
      console.log(`[CLIENT] Promotion selected: ${pieceType}`)
      if (pendingPromotion) {
        handleMove({ ...pendingPromotion, promotion: pieceType })
        setShowPromotionModal(false)
        setPendingPromotion(null)
      } else {
        console.error("[CLIENT] handlePromotion called without pendingPromotion set.")
      }
    },
    [pendingPromotion, handleMove],
  )

  const copyGameCode = () => {
    if (gameCode) {
      navigator.clipboard
        .writeText(gameCode)
        .then(() => {
          setShowCopyTooltip(true)
          setTimeout(() => setShowCopyTooltip(false), 2000)
        })
        .catch((err) => {
          console.error("Failed to copy game code:", err)
        })
    }
  }

  const boardDisabled = !isGameActive || currentTurn !== playerColor || game.isGameOver() || showPromotionModal

  return (
    <div className="chess-game-container">
      <div className="status-bar">
        <div className={`game-status ${statusClass}`}>{status}</div>
        {gameCode && (
          <div className="game-code-container">
            <div className="game-code">
              Game Code: <strong>{gameCode}</strong>
            </div>
            <button className="copy-button" onClick={copyGameCode} title="Copy game code">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <div className={`copy-tooltip ${showCopyTooltip ? "visible" : ""}`}>Copied!</div>
          </div>
        )}
      </div>

      <div className="game-layout">
        <UserTile
          name={playerColor === "w" ? opponentName : playerName}
          capturedPieces={capturedPieces[playerColor === "w" ? "b" : "w"] || []}
          side="top"
          color={playerColor === "w" ? "Black" : "White"}
          timeLeft={timeLeft[playerColor === "w" ? "black" : "white"]}
        />

        <div className="chessboard-container">
          <Chessboard
            id="ChessBoard"
            position={fen}
            onDrop={handleDrop}
            orientation={playerColor === "b" ? "black" : "white"}
            draggable={!boardDisabled}
            width={Math.min(500, window.innerWidth > 600 ? 500 : window.innerWidth - 40)}
            onSquareClick={onSquareClick}
            squareStyles={highlightSquareStyles()}
            boardStyle={{
              borderRadius: "10px",
              boxShadow: `0 10px 25px rgba(0, 0, 0, 0.2)`,
            }}
            lightSquareStyle={{ backgroundColor: "#F0D9B5" }}
            darkSquareStyle={{ backgroundColor: "#B58863" }}
            dropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgba(243, 156, 18, 0.5)" }}
          />
        </div>

        <UserTile
          name={playerColor === "w" ? playerName : opponentName}
          capturedPieces={capturedPieces[playerColor === "w" ? "w" : "b"] || []}
          side="bottom"
          color={playerColor === "w" ? "White" : "Black"}
          timeLeft={timeLeft[playerColor === "w" ? "white" : "black"]}
        />
      </div>

      {showPromotionModal && (
        <PromotionModal
          onClose={() => {
            console.log("[CLIENT] Promotion modal closed without selection.")
            setShowPromotionModal(false)
            setPendingPromotion(null)
            setSelectedPiece(null)
            setPossibleMoves([])
          }}
          onPromotion={handlePromotion}
          color={playerColor}
        />
      )}

      {!gameCode && !isGameActive && (
        <div className="game-controls">
          <button onClick={() => setShowCreateDialog(true)} className="control-button">
            Create New Game
          </button>
          <button onClick={() => setShowJoinDialog(true)} className="control-button">
            Join Game
          </button>
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
            style={{ textTransform: "uppercase" }}
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
              onChange={(e) => setSelectedGameType(gameTypes.find((type) => type.name === e.target.value))}
            >
              {gameTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name} ({type.time} min)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="colorSelect">Your Color:</label>
            <select id="colorSelect" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
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
  )
}

export default ChessBoardComponent
