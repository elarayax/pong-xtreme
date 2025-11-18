import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Block } from '../types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_SPEED,
  BALL_SIZE,
  INITIAL_BALL_SPEED,
  MAX_BOUNCE_ANGLE,
  POINTS_TO_ADD_BLOCK,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  WINNING_SCORE,
  BALL_SPEED_INCREMENT,
} from '../constants';

const createInitialState = (): GameState => ({
  paddles: {
    left: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
    right: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
  },
  ball: {
    position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    velocity: { 
      x: Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED,
      y: (Math.random() - 0.5) * INITIAL_BALL_SPEED 
    },
  },
  blocks: [],
  score: { player1: 0, player2: 0 },
  isGameActive: false,
  winner: null,
  ballSpeed: INITIAL_BALL_SPEED,
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
  
  const resetBall = (direction: number, speed: number) => {
     return {
        position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
        velocity: {
          x: direction * speed,
          y: (Math.random() - 0.5) * speed,
        },
      };
  }

  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.isGameActive || prev.winner) return prev;

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
      } else if (isCollidingWithRightPaddle && ball.velocity.x > 0) {
        const relativeIntersectY = (paddles.right.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        ball.velocity.x = -prev.ballSpeed * Math.cos(bounceAngle);
        ball.velocity.y = prev.ballSpeed * -Math.sin(bounceAngle);
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
          break; // only handle one collision per frame
        }
      }

      // Scoring
      let newWinner = prev.winner;
      let newBallSpeed = prev.ballSpeed;
      if (ball.position.x < 0) {
        score.player2++;
        newBallSpeed += BALL_SPEED_INCREMENT;
        ball = resetBall(1, newBallSpeed);
      } else if (ball.position.x > GAME_WIDTH) {
        score.player1++;
        newBallSpeed += BALL_SPEED_INCREMENT;
        ball = resetBall(-1, newBallSpeed);
      }

      const totalScore = score.player1 + score.player2;
      if(totalScore > 0 && totalScore % POINTS_TO_ADD_BLOCK === 0 && blocks.length < totalScore / POINTS_TO_ADD_BLOCK) {
          const canSpawnMultiple = blocks.length >= 2;
          const shouldSpawnTwo = canSpawnMultiple && Math.random() < 0.4; // 40% chance
          const numToSpawn = shouldSpawnTwo ? 2 : 1;

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

      // Check for winner
      let isGameActive = prev.isGameActive;
      if (score.player1 >= WINNING_SCORE) {
        newWinner = 'Player 1';
        isGameActive = false;
      } else if (score.player2 >= WINNING_SCORE) {
        newWinner = 'Player 2';
        isGameActive = false;
      }

      return { ...prev, paddles, ball, blocks, score, winner: newWinner, isGameActive, ballSpeed: newBallSpeed };
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
    setGameState(prev => ({...createInitialState(), isGameActive: true }));
  };

  return { gameState, startGame };
};