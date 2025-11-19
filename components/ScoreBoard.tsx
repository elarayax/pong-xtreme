
import React from 'react';

interface ScoreBoardProps {
  score: {
    player1: number;
    player2: number;
  };
  playerNames?: {
    player1: string;
    player2: string;
  };
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, playerNames }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-3xl">
      <div className="flex justify-between w-full px-8 mb-2 font-bold text-lg tracking-widest uppercase" style={{ fontFamily: '"Bangers", system-ui' }}>
         <span className="text-blue-400 drop-shadow-md">{playerNames?.player1 || 'PLAYER 1'}</span>
         <span className="text-red-400 drop-shadow-md">{playerNames?.player2 || 'PLAYER 2'}</span>
      </div>
      <div className="flex justify-center items-center text-white font-mono text-5xl md:text-6xl space-x-16 mb-4">
        <div className="p-4 rounded-lg bg-gray-800 shadow-lg border-2 border-blue-900">
          <span className="text-blue-400">{score.player1}</span>
        </div>
        <div className="p-4 rounded-lg bg-gray-800 shadow-lg border-2 border-red-900">
          <span className="text-red-400">{score.player2}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;
