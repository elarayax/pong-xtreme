
import React from 'react';

interface ScoreBoardProps {
  score: {
    player1: number;
    player2: number;
  };
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score }) => {
  return (
    <div className="flex justify-center items-center text-white font-mono text-5xl md:text-6xl space-x-16 my-4">
      <div className="p-4 rounded-lg bg-gray-800 shadow-lg">
        <span className="text-blue-400">{score.player1}</span>
      </div>
      <div className="p-4 rounded-lg bg-gray-800 shadow-lg">
        <span className="text-red-400">{score.player2}</span>
      </div>
    </div>
  );
};

export default ScoreBoard;
