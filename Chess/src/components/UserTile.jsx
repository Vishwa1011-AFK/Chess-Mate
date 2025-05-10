"use client"

import { useEffect, useState } from "react"
import "./UserTile.css"

const formatTime = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// Map piece codes to image paths
const getPieceImagePath = (piece) => {
  if (!piece) return null

  const color = piece.charAt(0)
  const type = piece.charAt(1).toLowerCase()
  return `/src/assets/images/pieces/${color}${type}.png`
}

const UserTile = ({ name, timeLeft, capturedPieces = [], side, color }) => {
  const [isLowTime, setIsLowTime] = useState(false)

  useEffect(() => {
    // Set low time warning when under 30 seconds
    setIsLowTime(timeLeft < 30)
  }, [timeLeft])

  return (
    <div className={`user-tile ${side}`}>
      <div className="user-info">
        <span className="user-name">{name}</span>
        <span className="user-color">({color})</span>

        {capturedPieces && capturedPieces.length > 0 && (
          <div className="captured-pieces">
            {capturedPieces.map((piece, index) => (
              <div
                key={`${piece}-${index}`}
                className="captured-piece"
                style={{ backgroundImage: `url(${getPieceImagePath(piece)})` }}
                title={`Captured ${piece}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className={`user-timer ${isLowTime ? "low" : ""}`}>{formatTime(timeLeft)}</div>
    </div>
  )
}

export default UserTile
