
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
  POINTS_TO_ADD_BLOCK,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  WINNING_SCORE,
  BALL_SPEED_INCREMENT,
} from '../constants';

// Sound Utility
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

const playGameSound = (type: 'paddle' | 'wall' | 'block' | 'score') => {
  if (!audioCtx) return;
  // Resume context if suspended (browser autoplay policy)
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
  ballSpeed: INITIAL_BALL_SPEED,
  countdown: 0,
  nextBallDirection: 0,
  lastScorer: null,
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
                y: (Math.random() - 0.5) * prev.ballSpeed
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
        const relativeIntersectY = (paddles.left.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        ball.velocity.x = prev.ballSpeed * Math.cos(bounceAngle);
        ball.velocity.y = prev.ballSpeed * -Math.sin(bounceAngle);
        playGameSound('paddle');
      } else if (isCollidingWithRightPaddle && ball.velocity.x > 0) {
        const relativeIntersectY = (paddles.right.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        ball.velocity.x = -prev.ballSpeed * Math.cos(bounceAngle);
        ball.velocity.y = prev.ballSpeed * -Math.sin(bounceAngle);
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
            // Horizontal collision
            ball.velocity.x *= -1;
            // Move ball out of collision
            ball.position.x += (dx > 0 ? overlapX : -overlapX);
          } else {
            // Vertical collision
            ball.velocity.y *= -1;
            // Move ball out of collision
            ball.position.y += (dy > 0 ? overlapY : -overlapY);
          }
          playGameSound('block');
          break; // only handle one collision per frame
        }
      }

      // Scoring
      let newWinner = prev.winner;
      let newBallSpeed = prev.ballSpeed;
      let newCountdown = prev.countdown;
      let newDirection = prev.nextBallDirection;
      let lastScorer = prev.lastScorer;

      if (ball.position.x < 0) {
        score.player2++;
        playGameSound('score');
        lastScorer = 'Player 2';
        newBallSpeed += BALL_SPEED_INCREMENT;
        // Reset logic
        ball = resetBallPosition(1);
        newCountdown = 3;
        newDirection = 1; // Towards Player 2
        // Reset paddles
        paddles.left.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        paddles.right.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      } else if (ball.position.x > GAME_WIDTH) {
        score.player1++;
        playGameSound('score');
        lastScorer = 'Player 1';
        newBallSpeed += BALL_SPEED_INCREMENT;
        // Reset logic
        ball = resetBallPosition(-1);
        newCountdown = 3;
        newDirection = -1; // Towards Player 1
        // Reset paddles
        paddles.left.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
        paddles.right.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      }

      // Block Spawning
      const totalScore = score.player1 + score.player2;
      // Check if score changed (someone scored) and it's a multiple for blocks
      const someoneScored = (ball.velocity.x === 0 && newCountdown === 3); 
      
      // We only want to spawn blocks if a point was just scored
      if (someoneScored && totalScore > 0 && totalScore % POINTS_TO_ADD_BLOCK === 0) {
          // Cap max blocks to prevent total chaos filling the screen
          if (blocks.length < totalScore / POINTS_TO_ADD_BLOCK + 2) {
            const canSpawnMultiple = blocks.length >= 2;
            let numToSpawn = 1;

            if (canSpawnMultiple) {
                const r1 = Math.random();
                if (r1 < 0.8) { // 80% chance for at least 2
                    numToSpawn = 2;
                    const r2 = Math.random();
                    if (r2 < 0.4) { // 40% chance for at least 3
                        numToSpawn = 3;
                        const r3 = Math.random();
                        if (r3 < 0.1) { // 10% chance for 4
                            numToSpawn = 4;
                        }
                    }
                }
            }

            for (let i = 0; i < numToSpawn; i++) {
              const newBlock: Block = {
                  position: {
                      x: GAME_WIDTH / 2 - BLOCK_WIDTH / 2,
                      y: Math.random() * (GAME_HEIGHT - BLOCK_HEIGHT),
                  }
              };
              blocks.push(newBlock);
            }
          }
      }

      // Check for winner
      let isGameActive = prev.isGameActive;
      if (score.player1 >= WINNING_SCORE) {
        newWinner = 'Player 1';
        isGameActive = false;
      } else if (score.player2 >= WINNING_SCORE) {
        newWinner = 'Player 2';
        isGameActive = false;
      }

      return { 
          ...prev, 
          paddles, 
          ball, 
          blocks, 
          score, 
          winner: newWinner, 
          isGameActive, 
          ballSpeed: newBallSpeed,
          countdown: newCountdown,
          nextBallDirection: newDirection,
          lastScorer
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
