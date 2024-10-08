import React from 'react';
import './PromotionModal.css'; // Ensure you style your modal appropriately

const PromotionModal = ({ onClose, onPromote }) => {
  const handlePromotion = (piece) => {
    onPromote(piece); // Call the promotion handler with the selected piece
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Promote Pawn</h2>
        <div className="promotion-options">
          <button onClick={() => handlePromotion('q')}>Queen</button>
          <button onClick={() => handlePromotion('r')}>Rook</button>
          <button onClick={() => handlePromotion('b')}>Bishop</button>
          <button onClick={() => handlePromotion('n')}>Knight</button>
        </div>
        <button onClick={onClose} className="close-button">Close</button>
      </div>
    </div>
  );
};

export default PromotionModal;
