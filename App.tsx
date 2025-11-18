
import React from 'react';
import ScoreBoard from './components/ScoreBoard';
import GameBoard from './components/GameBoard';
import { useGameLogic } from './hooks/useGameLogic';

const App: React.FC = () => {
  const { gameState, startGame } = useGameLogic();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-mono">
      <header className="text-center mb-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-red-400">
          PONG BLOCKS
        </h1>
        <p className="text-gray-400 mt-2">A classic with a chaotic twist.</p>
      </header>
      
      <ScoreBoard score={gameState.score} />

      <div className="relative">
        <GameBoard gameState={gameState} />
        
        {(!gameState.isGameActive || gameState.winner) && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-center p-4">
            {gameState.winner ? (
              <>
                <h2 className="text-5xl font-bold text-yellow-400 mb-4">GAME OVER</h2>
                <p className="text-2xl mb-6">{gameState.winner} wins!</p>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
                >
                  Play Again
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-4">Controls</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-lg">
                  <p className="text-blue-400 font-semibold">Player 1:</p>
                  <p className="text-gray-200">'W' (Up) & 'S' (Down)</p>
                  <p className="text-red-400 font-semibold">Player 2:</p>
                  <p className="text-gray-200">'↑' (Up) & '↓' (Down)</p>
                </div>
                 <p className="text-sm mt-4 text-gray-400">A new block appears every 2 points!</p>
                <button
                  onClick={startGame}
                  className="mt-8 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl rounded-lg shadow-lg transition-transform transform hover:scale-105"
                >
                  Start Game
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <footer className="mt-6 text-gray-500 text-sm">
        Built with React, TypeScript, and Tailwind CSS.
      </footer>
    </div>
  );
};

export default App;
