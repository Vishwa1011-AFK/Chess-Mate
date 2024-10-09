import React from 'react';
import './PromotionModal.css';

const PromotionModal = ({ onClose, onPromotion, color }) => {
  const pieces = ['q', 'r', 'b', 'n'];

  return (
    <div className="promotion-modal">
      <div className="promotion-content">
        <h2>Choose Promotion</h2>
        <div className="promotion-options">
          {pieces.map((piece) => (
            <button key={piece} onClick={() => onPromotion(piece)}>
              {String.fromCharCode(9812 + pieces.indexOf(piece) + (color === 'b' ? 6 : 0))}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;