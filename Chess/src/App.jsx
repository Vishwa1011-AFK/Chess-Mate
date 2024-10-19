import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ChessBoardComponent from './components/ChessBoard'; 
import LoadingRandomPage from './components/LoadingRandomPage';
import './App.css';

function App() {
  const [showChessboard, setShowChessboard] = useState(false);

  const handlePlayButtonClick = () => {
    setShowChessboard(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        {showChessboard ? (
          <ChessBoardComponent />
        ) : (
          <div className="chessboard-wrapper">
            <LoadingRandomPage />
            <button className="lets-play-button" onClick={handlePlayButtonClick}>
              Let's Play!
            </button>
          </div>
        )}
      </div>
    </DndProvider>
  );
}

export default App;
