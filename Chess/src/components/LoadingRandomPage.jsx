"use client"

import { useEffect, useState, useRef } from "react"
import Chessboard from "chessboardjsx"
import { Chess } from "chess.js"
import "./LoadingRandomPage.css" // Import the CSS file

const quotes = [
  '"The chessboard is the world, the pieces are the phenomena of the universe." – Mikhail Botvinnik',
  '"Every chess master was once a beginner." – Irving Chernev',
  '"Chess is life in miniature. Chess is a struggle, chess battles." – Garry Kasparov',
  '"Chess is the gymnasium of the mind." – Blaise Pascal',
  '"Chess is a war over the board. The object is to crush the opponent\'s mind." – Bobby Fischer',
  '"Chess is beautiful enough to waste your life for." – Hans Ree',
  '"Chess is the art which expresses the science of logic." – Mikhail Botvinnik',
  '"Chess is mental torture." – Garry Kasparov',
  '"Chess is as much a mystery as women." – Purdy',
  '"Chess is everything: art, science, and sport." – Anatoly Karpov',
]

const ChessMate = () => {
  const [game] = useState(new Chess())
  const [fen, setFen] = useState("start")
  const [currentQuote, setCurrentQuote] = useState(quotes[0])
  const [fadeIn, setFadeIn] = useState(true)
  const moveTimeoutRef = useRef(null)
  const quoteIntervalRef = useRef(null)

  useEffect(() => {
    const makeRandomMove = () => {
      const possibleMoves = game.moves()
      if (game.isGameOver()) {
        // Reset the game if it's over
        game.reset()
        setFen(game.fen())
        moveTimeoutRef.current = setTimeout(makeRandomMove, 750)
        return
      }
      const randomIdx = Math.floor(Math.random() * possibleMoves.length)
      game.move(possibleMoves[randomIdx])
      setFen(game.fen())
      moveTimeoutRef.current = setTimeout(makeRandomMove, 750)
    }

    const rotateQuotes = () => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentQuote((prevQuote) => {
          const currentIndex = quotes.indexOf(prevQuote)
          const nextIndex = (currentIndex + 1) % quotes.length
          return quotes[nextIndex]
        })
        setFadeIn(true)
      }, 500)
    }

    moveTimeoutRef.current = setTimeout(makeRandomMove, 1000)
    quoteIntervalRef.current = setInterval(rotateQuotes, 5000)

    return () => {
      if (moveTimeoutRef.current) clearTimeout(moveTimeoutRef.current)
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current)
    }
  }, [game])

  return (
    <div className="chess-mate">
      <div className="chessboard-container">
        <Chessboard
          position={fen}
          width={550}
          boardStyle={{
            borderRadius: "8px",
            boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
          }}
          lightSquareStyle={{ backgroundColor: "#F0D9B5" }}
          darkSquareStyle={{ backgroundColor: "#B58863" }}
        />
      </div>
      <div className="content-container">
        <h1>Chess Mate?</h1>
        <p
          className={`quote ${fadeIn ? "fade-in" : ""}`}
          style={{ opacity: fadeIn ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          {currentQuote}
        </p>
      </div>
    </div>
  )
}

export default ChessMate
