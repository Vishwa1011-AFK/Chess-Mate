import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ChessBoardComponent from './components/ChessBoard'; 
import './App.css';

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        <ChessBoardComponent />
      </div>
    </DndProvider>
  );
}

export default App;
