import React, { useEffect, useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import './LoadingRandomPage.css'; // Import the CSS file

const quotes = [
  '"The chessboard is the world, the pieces are the phenomena of the universe." – Mikhail Botvinnik',
  '"Every chess master was once a beginner." – Irving Chernev',
  '"Chess is life in miniature. Chess is a struggle, chess battles." – Garry Kasparov',
  '"Chess is the gymnasium of the mind." – Blaise Pascal',
  '"Chess is a war over the board. The object is to crush the opponent\'s mind." – Bobby Fischer'
];

const ChessMate = () => {
  const [game] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  useEffect(() => {
    const makeRandomMove = () => {
      const possibleMoves = game.moves();
      if (game.isGameOver()) {
        return;
      }
      const randomIdx = Math.floor(Math.random() * possibleMoves.length);
      game.move(possibleMoves[randomIdx]);
      setFen(game.fen());
      setTimeout(makeRandomMove, 750);
    };

    const rotateQuotes = () => {
      setCurrentQuote((prevQuote) => {
        const currentIndex = quotes.indexOf(prevQuote);
        const nextIndex = (currentIndex + 1) % quotes.length;
        return quotes[nextIndex];
      });
    };

    setTimeout(makeRandomMove, 1000);
    const quoteInterval = setInterval(rotateQuotes, 5000);

    return () => {
      clearInterval(quoteInterval);
    };
  }, [game]);

  return (
    <div className="chess-mate">
      <div className="chessboard-container">
        <Chessboard position={fen} width={550} />
      </div>
      <div className="content-container">
        <h1>Chess Mate?</h1>
        <p className="quote">{currentQuote}</p>
      </div>
    </div>
  );
};

export default ChessMate;
