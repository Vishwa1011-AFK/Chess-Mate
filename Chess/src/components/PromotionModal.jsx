"use client"
import "./PromotionModal.css"

const PromotionModal = ({ onClose, onPromotion, color }) => {
  const pieces = ["q", "r", "b", "n"]

  const getPieceSymbol = (piece) => {
    const symbols = {
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
    }
    return color === "w" ? symbols[piece] : symbols[piece].toLowerCase()
  }

  const getPieceName = (piece) => {
    const names = {
      q: "Queen",
      r: "Rook",
      b: "Bishop",
      n: "Knight",
    }
    return names[piece]
  }

  return (
    <div className="promotion-modal-overlay">
      <div className="promotion-modal">
        <div className="promotion-content">
          <h2>Choose Promotion</h2>
          <div className="promotion-options">
            {pieces.map((piece) => (
              <button
                key={piece}
                className={`promotion-piece ${color}`}
                onClick={() => {
                  onPromotion(piece)
                  onClose()
                }}
                title={getPieceName(piece)}
                aria-label={`Promote to ${getPieceName(piece)}`}
              >
                {getPieceSymbol(piece)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromotionModal
