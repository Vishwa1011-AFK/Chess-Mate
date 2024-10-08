import React from 'react';

// Import all images
import bbPng from '../assets/images/bb.png';
import bkPng from '../assets/images/bk.png';
import bnPng from '../assets/images/bn.png';
import bpPng from '../assets/images/bp.png';
import bqPng from '../assets/images/bq.png';
import brPng from '../assets/images/br.png';
import wbPng from '../assets/images/wb.png';
import wkPng from '../assets/images/wk.png';
import wnPng from '../assets/images/wn.png';
import wpPng from '../assets/images/wp.png';
import wqPng from '../assets/images/wq.png';
import wrPng from '../assets/images/wr.png';

const pieceImages = {
  b: { p: bpPng, n: bnPng, b: bbPng, r: brPng, q: bqPng, k: bkPng },
  w: { p: wpPng, n: wnPng, b: wbPng, r: wrPng, q: wqPng, k: wkPng },
};

const CapturedPieces = ({ capturedPieces, side }) => {
  const pieceOrder = ['p', 'n', 'b', 'r', 'q'];

  const sortedPieces = capturedPieces.sort((a, b) => {
    return pieceOrder.indexOf(a.toLowerCase()) - pieceOrder.indexOf(b.toLowerCase());
  });

  return (
    <div className="captured-pieces-sidebar">
      <div className="captured-pieces-title">
       {side === 'white' ? 'White' : 'Black'} 
      </div>
      <div className="captured-pieces">
        {sortedPieces.map((piece, index) => {
          const color = piece === piece.toUpperCase() ? 'w' : 'b';
          const pieceType = piece.toLowerCase();
          return (
            <img
              key={`${piece}-${index}`}
              src={pieceImages[color][pieceType]}
              alt={`Captured ${color === 'w' ? 'White' : 'Black'} ${pieceType}`}
              className="captured-piece"
            />
          );
        })}
      </div>
    </div>
  );
};

export default CapturedPieces;
