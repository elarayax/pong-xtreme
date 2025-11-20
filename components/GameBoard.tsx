
import React from 'react';
import { GameState } from '../types';
import { GAME_WIDTH, GAME_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, BLOCK_WIDTH, BLOCK_HEIGHT, AVAILABLE_SKINS } from '../constants';

interface GameBoardProps {
  gameState: GameState;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
  const { paddles, ball, blocks, countdown, nextBallDirection, isGameActive, winner, lastScorer, isPaused, boardRotation, isNoScope, isPongPoint, skins, hasSpeedThresholdMet, hasYamerooPlayed } = gameState;

  // Helper to get skin classes
  const getSkinStyles = (side: 'left' | 'right', skinKey: string) => {
      const skin = AVAILABLE_SKINS[skinKey as keyof typeof AVAILABLE_SKINS] || AVAILABLE_SKINS.default;
      
      if (skinKey === 'default') {
          return {
              bg: side === 'left' ? 'bg-blue-400' : 'bg-red-400',
              shadow: side === 'left' ? '0 0 10px #60a5fa' : '0 0 10px #f87171',
              border: '',
              icon: ''
          };
      }
      return {
          bg: skin.bg,
          shadow: `0 0 15px ${skin.glow?.replace('shadow-', '')}`, // Using class logic or just approximate
          border: `2px solid ${skin.border?.replace('border-', '')}`, // This is a bit hacky with tailwind strings, let's use classNames
          borderClass: skin.border,
          glowClass: skin.glow,
          icon: skin.icon
      };
  };

  const leftSkin = getSkinStyles('left', skins.player1);
  const rightSkin = getSkinStyles('right', skins.player2);

  // Dynamic Ball Styles
  const getBallStyles = () => {
      // 1. Yameroo Mode (Super Rally) - Gold/Yellow
      if (hasYamerooPlayed) {
          return {
              bg: 'bg-yellow-400',
              shadow: '0 0 30px #facc15',
              classes: 'animate-pulse' // Intense pulsing
          };
      }
      // 2. Light Speed Mode - Intense White Pulse
      if (hasSpeedThresholdMet) {
          return {
              bg: 'bg-white',
              shadow: '0 0 30px #ffffff',
              classes: 'animate-pulse brightness-150' // Brightness boost + pulse
          };
      }
      // 3. Normal
      return {
          bg: 'bg-white',
          shadow: '0 0 20px #ffffff',
          classes: ''
      };
  };

  const ballStyle = getBallStyles();

  return (
    <div 
      className="relative bg-black border-4 border-gray-600 shadow-2xl overflow-hidden transition-transform duration-300 ease-out"
      style={{ 
        width: GAME_WIDTH, 
        height: GAME_HEIGHT,
        transform: `rotate(${boardRotation}deg)` 
      }}
    >
      {/* Center Line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="w-full h-10 bg-gray-700" style={{ marginBottom: '10px' }}></div>
        ))}
      </div>

      {/* Left Paddle */}
      <div
        className={`absolute shadow-lg flex items-center justify-center overflow-visible z-10 ${leftSkin.bg} ${leftSkin.borderClass || ''} ${leftSkin.glowClass || ''}`}
        style={{
          left: '20px',
          top: `${paddles.left.y}px`,
          width: `${PADDLE_WIDTH}px`,
          height: `${PADDLE_HEIGHT}px`,
          boxShadow: leftSkin.shadow?.startsWith('0') ? leftSkin.shadow : undefined, // Use inline only if calculated manually
        }}
      >
          {leftSkin.icon && (
              <span className="text-2xl absolute -left-8 animate-bounce" style={{filter: 'drop-shadow(0 0 2px black)'}}>
                  {leftSkin.icon}
              </span>
          )}
      </div>

      {/* Right Paddle */}
      <div
        className={`absolute shadow-lg flex items-center justify-center overflow-visible z-10 ${rightSkin.bg} ${rightSkin.borderClass || ''} ${rightSkin.glowClass || ''}`}
        style={{
          right: '20px',
          top: `${paddles.right.y}px`,
          width: `${PADDLE_WIDTH}px`,
          height: `${PADDLE_HEIGHT}px`,
          boxShadow: rightSkin.shadow?.startsWith('0') ? rightSkin.shadow : undefined,
        }}
      >
          {rightSkin.icon && (
              <span className="text-2xl absolute -right-8 animate-bounce" style={{filter: 'drop-shadow(0 0 2px black)'}}>
                  {rightSkin.icon}
              </span>
          )}
      </div>

      {/* Blocks */}
      {blocks.map((block, index) => (
        <div
          key={index}
          className="absolute bg-purple-500 border-2 border-purple-300"
          style={{
            left: `${block.position.x}px`,
            top: `${block.position.y}px`,
            width: `${BLOCK_WIDTH}px`,
            height: `${BLOCK_HEIGHT}px`,
            boxShadow: '0 0 15px #a855f7',
          }}
        />
      ))}

      {/* Ball */}
      <div
        className={`absolute rounded-full ${ballStyle.bg} ${ballStyle.classes}`}
        style={{
          left: `${ball.position.x - BALL_SIZE / 2}px`,
          top: `${ball.position.y - BALL_SIZE / 2}px`,
          width: `${BALL_SIZE}px`,
          height: `${BALL_SIZE}px`,
          boxShadow: ballStyle.shadow,
        }}
      />

      {/* Scored Point Overlay */}
      {lastScorer && !winner && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none" style={{ transform: `rotate(${-boardRotation}deg)` }}>
              {isNoScope ? (
                   <div className="mb-4 animate-ping">
                       <h2 className="text-7xl font-black text-red-500 italic drop-shadow-[0_5px_5px_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px white' }}>
                           NO SCOPE!
                       </h2>
                   </div>
              ) : isPongPoint ? (
                   <div className="mb-4">
                       <h2 className="text-7xl font-bold text-green-400 animate-bounce drop-shadow-lg tracking-widest" style={{ fontFamily: '"VT323", monospace' }}>
                           PONG POINT!
                       </h2>
                   </div>
              ) : (
                  <h2 className="text-6xl font-black text-yellow-400 animate-bounce drop-shadow-xl uppercase tracking-widest">
                      POINT!
                  </h2>
              )}
              
              <p className="text-2xl text-white font-bold mt-2 animate-pulse">
                  {lastScorer} scored
              </p>
          </div>
      )}

      {/* Countdown Overlay */}
      {isGameActive && !winner && countdown > 0 && !isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20" style={{ transform: `rotate(${-boardRotation}deg)` }}>
              <div className="text-8xl font-bold text-white animate-pulse drop-shadow-lg mb-4">
                  {countdown}
              </div>
              <div className="text-yellow-400 animate-bounce">
                  {nextBallDirection === 1 ? (
                      // Right Arrow
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-24 h-24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                  ) : (
                      // Left Arrow
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-24 h-24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                  )}
              </div>
          </div>
      )}
      
      {/* Paused Overlay */}
      {isPaused && !winner && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40" style={{ transform: `rotate(${-boardRotation}deg)` }}>
              <h2 className="text-6xl font-mono font-bold text-white tracking-[0.5em] animate-pulse drop-shadow-lg">
                  PAUSED
              </h2>
          </div>
      )}
    </div>
  );
};

export default GameBoard;
