
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Block } from '../types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  BALL_SIZE,
  INITIAL_BALL_SPEED,
  MAX_BOUNCE_ANGLE,
  POINTS_TO_START_BLOCKS,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BASE_WINNING_SCORE,
  WIN_BY_MARGIN,
  BALL_SPEED_INCREMENT,
  RALLY_HITS_THRESHOLD,
  RALLY_HITS_INTERVAL,
  MAX_PROGRESSION_SCORE,
} from '../constants';

// Sound Utility
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

const playGameSound = (type: 'paddle' | 'wall' | 'block' | 'score' | 'win') => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'paddle':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'wall':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      break;
    case 'block':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
    case 'score':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.linearRampToValueAtTime(600, now + 0.2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
    case 'win':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.linearRampToValueAtTime(1000, now + 0.5);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.5);
      oscillator.start(now);
      oscillator.stop(now + 1.5);
      break;
  }
};

const createInitialState = (): GameState => ({
  paddles: {
    left: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    right: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
  },
  ball: {
    position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    velocity: { x: 0, y: 0 },
  },
  blocks: [],
  score: { player1: 0, player2: 0 },
  isGameActive: false,
  winner: null,
  isMasacre: false,
  ballSpeed: INITIAL_BALL_SPEED,
  rallyPaddleHits: 0,
  countdown: 0,
  nextBallDirection: 0,
  lastScorer: null,
  consecutiveStraightHits: 0,
});

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const keysPressed = useRef<Record<string, boolean>>({});
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle Countdown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (gameState.isGameActive && gameState.countdown > 0 && !gameState.winner) {
      timer = setTimeout(() => {
        setGameState((prev) => {
          const newCount = prev.countdown - 1;
          let newBall = { ...prev.ball };
          let lastScorer = prev.lastScorer;
          
          // Launch ball when countdown hits 0
          if (newCount === 0) {
             newBall.velocity = {
                x: prev.nextBallDirection * prev.ballSpeed,
                y: 0 // Launch straight
             };
             lastScorer = null; // Clear score animation
          }

          return {
            ...prev,
            countdown: newCount,
            ball: newBall,
            lastScorer
          };
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [gameState.countdown, gameState.isGameActive, gameState.winner]);
  
  const resetBallPosition = (direction: number) => {
     return {
        position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
        velocity: { x: 0, y: 0 }, // Stop ball for countdown
      };
  };

  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.isGameActive || prev.winner) return prev;
      
      // Pause physics during countdown
      if (prev.countdown > 0) return prev;

      let { paddles, ball, blocks, score } = JSON.parse(JSON.stringify(prev));
      let newBallSpeed = prev.ballSpeed;
      let rallyPaddleHits = prev.rallyPaddleHits;
      let newConsecutiveStraightHits = prev.consecutiveStraightHits;

      // Move paddles
      if (keysPressed.current['w']) {
        paddles.left.y = Math.max(0, paddles.left.y - PADDLE_SPEED);
      }
      if (keysPressed.current['s']) {
        paddles.left.y = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, paddles.left.y + PADDLE_SPEED);
      }
      if (keysPressed.current['ArrowUp']) {
        paddles.right.y = Math.max(0, paddles.right.y - PADDLE_SPEED);
      }
      if (keysPressed.current['ArrowDown']) {
        paddles.right.y = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, paddles.right.y + PADDLE_SPEED);
      }

      // Move ball
      ball.position.x += ball.velocity.x;
      ball.position.y += ball.velocity.y;

      // Wall collision (top/bottom)
      if (ball.position.y - BALL_SIZE / 2 <= 0 || ball.position.y + BALL_SIZE / 2 >= GAME_HEIGHT) {
        ball.velocity.y *= -1;
        playGameSound('wall');
      }

      // Helper for Speed Up Logic
      const checkSpeedUp = (currentHits: number) => {
          // 1. Check if we passed threshold (5)
          // 2. Check if hits above threshold are multiple of interval (2)
          if (currentHits === RALLY_HITS_THRESHOLD) {
              return true;
          }
          if (currentHits > RALLY_HITS_THRESHOLD && 
             (currentHits - RALLY_HITS_THRESHOLD) % RALLY_HITS_INTERVAL === 0) {
              return true;
          }
          return false;
      };
      
      // Calculate total score from current state (safe as we haven't mutated score yet this frame)
      const currentTotalScore = score.player1 + score.player2;

      // Paddle collision
      const isCollidingWithLeftPaddle = 
        ball.position.x - BALL_SIZE / 2 <= 20 + PADDLE_WIDTH &&
        ball.position.y > paddles.left.y &&
        ball.position.y < paddles.left.y + PADDLE_HEIGHT;

      const isCollidingWithRightPaddle =
        ball.position.x + BALL_SIZE / 2 >= GAME_WIDTH - 20 - PADDLE_WIDTH &&
        ball.position.y > paddles.right.y &&
        ball.position.y < paddles.right.y + PADDLE_HEIGHT;
      
      if (isCollidingWithLeftPaddle && ball.velocity.x < 0) {
        rallyPaddleHits++;
        if (checkSpeedUp(rallyPaddleHits) && currentTotalScore < MAX_PROGRESSION_SCORE) {
             newBallSpeed += BALL_SPEED_INCREMENT;
        }

        const relativeIntersectY = (paddles.left.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        let bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        
        // Anti-stuck logic
        if (Math.abs(bounceAngle) < 0.1) {
            newConsecutiveStraightHits++;
        } else {
            newConsecutiveStraightHits = 0;
        }

        if (newConsecutiveStraightHits >= 4) {
             // Force deflection
             const direction = Math.random() > 0.5 ? 1 : -1;
             bounceAngle = direction * 0.35; // Force ~20 degrees
             newConsecutiveStraightHits = 0;
        }

        ball.velocity.x = newBallSpeed * Math.cos(bounceAngle);
        ball.velocity.y = newBallSpeed * -Math.sin(bounceAngle);
        playGameSound('paddle');

      } else if (isCollidingWithRightPaddle && ball.velocity.x > 0) {
        rallyPaddleHits++;
        if (checkSpeedUp(rallyPaddleHits) && currentTotalScore < MAX_PROGRESSION_SCORE) {
             newBallSpeed += BALL_SPEED_INCREMENT;
        }

        const relativeIntersectY = (paddles.right.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        let bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        
        // Anti-stuck logic
        if (Math.abs(bounceAngle) < 0.1) {
            newConsecutiveStraightHits++;
        } else {
            newConsecutiveStraightHits = 0;
        }

        if (newConsecutiveStraightHits >= 4) {
             // Force deflection
             const direction = Math.random() > 0.5 ? 1 : -1;
             bounceAngle = direction * 0.35; // Force ~20 degrees
             newConsecutiveStraightHits = 0;
        }

        ball.velocity.x = -newBallSpeed * Math.cos(bounceAngle);
        ball.velocity.y = newBallSpeed * -Math.sin(bounceAngle);
        playGameSound('paddle');
      }
      
      // Block collision
      for (const block of blocks) {
        const dx = ball.position.x - (block.position.x + BLOCK_WIDTH / 2);
        const dy = ball.position.y - (block.position.y + BLOCK_HEIGHT / 2);
        const combinedHalfWidths = (BALL_SIZE + BLOCK_WIDTH) / 2;
        const combinedHalfHeights = (BALL_SIZE + BLOCK_HEIGHT) / 2;

        if (Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights) {
          const overlapX = combinedHalfWidths - Math.abs(dx);
          const overlapY = combinedHalfHeights - Math.abs(dy);

          if (overlapX < overlapY) {
            ball.velocity.x *= -1;
            ball.position.x += (dx > 0 ? overlapX : -overlapX);
          } else {
            ball.velocity.y *= -1;
            ball.position.y += (dy > 0 ? overlapY : -overlapY);
          }
          playGameSound('block');
          break; 
        }
      }

      // Scoring
      let newWinner = prev.winner;
      let isMasacre = false;
      let newCountdown = prev.countdown;
      let newDirection = prev.nextBallDirection;
      let lastScorer = prev.lastScorer;

      if (ball.position.x < 0) {
        score.player2++;
        playGameSound('score');
        lastScorer = 'Player 2';
        if ((score.player1 + score.player2) < MAX_PROGRESSION_SCORE) {
           newBallSpeed += BALL_SPEED_INCREMENT; 
        }
        rallyPaddleHits = 0;
        newConsecutiveStraightHits = 0;
        ball = resetBallPosition(1);
        newCountdown = 3;
        newDirection = 1;
        paddles.left.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        paddles.right.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      } else if (ball.position.x > GAME_WIDTH) {
        score.player1++;
        playGameSound('score');
        lastScorer = 'Player 1';
        if ((score.player1 + score.player2) < MAX_PROGRESSION_SCORE) {
            newBallSpeed += BALL_SPEED_INCREMENT;
        }
        rallyPaddleHits = 0;
        newConsecutiveStraightHits = 0;
        ball = resetBallPosition(-1);
        newCountdown = 3;
        newDirection = -1;
        paddles.left.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        paddles.right.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      }

      // Block Spawning Logic
      const totalScore = score.player1 + score.player2;
      const someoneScored = (ball.velocity.x === 0 && newCountdown === 3); 
      
      // Spawn blocks every point after score reaches threshold AND below max progression
      if (someoneScored && totalScore >= POINTS_TO_START_BLOCKS && totalScore < MAX_PROGRESSION_SCORE) {
          // Cap max blocks
          if (blocks.length < totalScore + 2) {
            const canSpawnMultiple = blocks.length >= 2;
            let numToSpawn = 1;

            if (canSpawnMultiple) {
                const r1 = Math.random();
                if (r1 < 0.8) { 
                    numToSpawn = 2;
                    const r2 = Math.random();
                    if (r2 < 0.4) { 
                        numToSpawn = 3;
                        const r3 = Math.random();
                        if (r3 < 0.1) { 
                            numToSpawn = 4;
                        }
                    }
                }
            }

            for (let i = 0; i < numToSpawn; i++) {
              let attempt = 0;
              let placed = false;
              
              while (attempt < 10 && !placed) {
                const newY = Math.random() * (GAME_HEIGHT - BLOCK_HEIGHT);
                // Check overlap with existing blocks
                // Since all blocks are at the same X, we only check Y distance.
                const isOverlapping = blocks.some(b => Math.abs(b.position.y - newY) < BLOCK_HEIGHT + 5); // 5px buffer
                
                if (!isOverlapping) {
                    const newBlock: Block = {
                        position: {
                            x: GAME_WIDTH / 2 - BLOCK_WIDTH / 2,
                            y: newY,
                        }
                    };
                    blocks.push(newBlock);
                    placed = true;
                }
                attempt++;
              }
            }
          }
      }

      // Check for winner with Deuce Logic
      let isGameActive = prev.isGameActive;
      const scoreDiff = Math.abs(score.player1 - score.player2);
      
      if ((score.player1 >= BASE_WINNING_SCORE || score.player2 >= BASE_WINNING_SCORE) && scoreDiff >= WIN_BY_MARGIN) {
          if (score.player1 > score.player2) {
              newWinner = 'Player 1';
              if (score.player2 === 0) isMasacre = true;
          } else {
              newWinner = 'Player 2';
              if (score.player1 === 0) isMasacre = true;
          }
          isGameActive = false;
          playGameSound('win');
      }

      return { 
          ...prev, 
          paddles, 
          ball, 
          blocks, 
          score, 
          winner: newWinner, 
          isMasacre,
          isGameActive, 
          ballSpeed: newBallSpeed,
          rallyPaddleHits,
          countdown: newCountdown,
          nextBallDirection: newDirection,
          lastScorer,
          consecutiveStraightHits: newConsecutiveStraightHits
      };
    });
  }, []);
  
  useEffect(() => {
    if (gameState.isGameActive && !gameState.winner) {
      const loop = () => {
        gameLoop();
        animationFrameId.current = requestAnimationFrame(loop);
      };
      animationFrameId.current = requestAnimationFrame(loop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
    };
  }, [gameState.isGameActive, gameState.winner, gameLoop]);

  const startGame = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    const startDir = Math.random() > 0.5 ? 1 : -1;
    setGameState(prev => ({
        ...createInitialState(), 
        isGameActive: true,
        countdown: 3,
        nextBallDirection: startDir
    }));
  };

  return { gameState, startGame };
};
