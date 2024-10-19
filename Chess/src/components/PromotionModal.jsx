import React from 'react';
import './PromotionModal.css';

const PromotionModal = ({ onClose, onPromotion, color }) => {
  const pieces = ['q', 'r', 'b', 'n'];

  const getPieceSymbol = (piece) => {
    const symbols = {
      q: '♕',
      r: '♖',
      b: '♗',
      n: '♘'
    };
    return color === 'w' ? symbols[piece] : symbols[piece].toLowerCase();
  };

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
                  onPromotion(piece);
                  onClose();
                }}
              >
                {getPieceSymbol(piece)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;