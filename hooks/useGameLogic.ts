import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Block, GameMode } from '../types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_WIDTH,
  BALL_SIZE,
  INITIAL_BALL_SPEED,
  HARDCORE_INITIAL_BALL_SPEED,
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
  MAX_BLOCKS_ON_SCREEN,
  MAX_BALL_SPEED,
  HIGH_SPEED_THRESHOLD,
  RALLY_ELEGANTO_THRESHOLD,
  RALLY_YAMEROO_THRESHOLD,
} from '../constants';

// Sound Utility - Lazy Initialization
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx && typeof window !== 'undefined') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

const playGameSound = (type: 'paddle' | 'wall' | 'block' | 'score' | 'win' | 'masacre' | 'noscope' | 'dramatic' | 'lightspeed' | 'pongpoint' | 'eleganto' | 'yameroo', extraData?: string) => {
  const ctx = getAudioContext();
  
  // Audio Context for SFX
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

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
      case 'masacre':
      case 'noscope':
      case 'dramatic':
      case 'lightspeed':
      case 'pongpoint':
      case 'eleganto':
      case 'yameroo':
        // Silence the synth fanfare, only voice will play below
        break;
    }
  }

  // Text To Speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && (type === 'win' || type === 'masacre' || type === 'noscope' || type === 'dramatic' || type === 'lightspeed' || type === 'pongpoint' || type === 'eleganto' || type === 'yameroo')) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    const japanVoice = voices.find(v => v.lang.startsWith('ja')); // Try to find Japanese voice for anime references

    if (type === 'masacre') {
        const text = "MASACRE!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 0.4; // Very deep
        u1.rate = 0.9;
        u1.volume = 1.0;
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else if (type === 'dramatic') {
        const text = "DRAMATIC FINISH!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 0.2; // Deepest
        u1.rate = 0.6; // Slow
        u1.volume = 1.0;
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else if (type === 'noscope') {
        const text = "NO SCOPE!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 1.5; 
        u1.rate = 1.2;
        u1.volume = 1.0;
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);
    
    } else if (type === 'pongpoint') {
        const text = "PONG POINT!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 0.1; // Extremely Robotic/Low
        u1.rate = 1.1;
        u1.volume = 1.0;
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else if (type === 'lightspeed') {
        const text = "Light speedo!!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 1.4; // High / Fast
        u1.rate = 1.4;
        u1.volume = 1.0; 
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else if (type === 'eleganto') {
        const text = "Elegan-to!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 0.8; // Sophisticated
        u1.rate = 0.9;
        u1.volume = 1.0;
        if (japanVoice) u1.voice = japanVoice; // Prefer JP voice for anime ref
        else if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else if (type === 'yameroo') {
        const text = "Yameroo Freeza!";
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 1.2; // Desperate/Shouting
        u1.rate = 1.1;
        u1.volume = 1.0;
        if (japanVoice) u1.voice = japanVoice; // Prefer JP voice for anime ref
        else if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);

    } else {
        // NORMAL WIN LOGIC
        const text = `${extraData} Wins`;
        const u1 = new SpeechSynthesisUtterance(text);
        u1.pitch = 0.6; 
        u1.rate = 0.9;
        u1.volume = 1.0;
        if (englishVoice) u1.voice = englishVoice;
        window.speechSynthesis.speak(u1);
    }
  }
};

const createInitialState = (mode: GameMode = 'classic', p1Name: string = 'Player 1', p2Name: string = 'Player 2'): GameState => ({
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
  playerNames: { player1: p1Name, player2: p2Name },
  isGameActive: false,
  isPaused: false,
  winner: null,
  isMasacre: false,
  isDramaticFinish: false,
  isNoScope: false,
  isPongPoint: false,
  ballSpeed: mode === 'hardcore' ? HARDCORE_INITIAL_BALL_SPEED : INITIAL_BALL_SPEED,
  rallyPaddleHits: 0,
  countdown: 0,
  nextBallDirection: 0,
  lastScorer: null,
  consecutiveStraightHits: 0,
  boardRotation: 0,
  mode: mode,
  lastHitter: null,
  currentPointWallHits: 0,
  hitBlockInFlight: false,
  hasSpeedThresholdMet: false,
  hasElegantoPlayed: false,
  hasYamerooPlayed: false,
});

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const keysPressed = useRef<Record<string, boolean>>({});
  const animationFrameId = useRef<number>();
  
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startGame = useCallback((mode: GameMode = 'classic', p1Name: string, p2Name: string) => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }

    const startDir = Math.random() > 0.5 ? 1 : -1;
    setGameState(prev => ({
        ...createInitialState(mode, p1Name, p2Name), 
        isGameActive: true,
        countdown: 3,
        nextBallDirection: startDir
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
          e.preventDefault();
      }

      keysPressed.current[e.key] = true;

      if (e.code === 'Space' || e.code === 'Enter') {
          const current = gameStateRef.current;
          if (!current.isGameActive || current.winner) {
              // no-op
          } else {
              setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
          }
      }
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
  }, [startGame]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (gameState.isGameActive && gameState.countdown > 0 && !gameState.winner && !gameState.isPaused) {
      timer = setTimeout(() => {
        setGameState((prev) => {
          if (prev.isPaused) return prev;

          const newCount = prev.countdown - 1;
          let newBall = { ...prev.ball };
          let lastScorer = prev.lastScorer;
          let isNoScope = prev.isNoScope;
          let isPongPoint = prev.isPongPoint;
          
          if (newCount === 0) {
             newBall.velocity = {
                x: prev.nextBallDirection * prev.ballSpeed,
                y: 0 
             };
             lastScorer = null;
             isNoScope = false;
             isPongPoint = false;
          }

          return {
            ...prev,
            countdown: newCount,
            ball: newBall,
            lastScorer,
            isNoScope,
            isPongPoint
          };
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [gameState.countdown, gameState.isGameActive, gameState.winner, gameState.isPaused]);
  
  const resetBallPosition = (direction: number) => {
     return {
        position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
        velocity: { x: 0, y: 0 },
      };
  };
  
  const getSpeedForScore = (totalScore: number, mode: GameMode) => {
      const progression = Math.min(totalScore, MAX_PROGRESSION_SCORE);
      const startSpeed = mode === 'hardcore' ? HARDCORE_INITIAL_BALL_SPEED : INITIAL_BALL_SPEED;
      return startSpeed + (progression * BALL_SPEED_INCREMENT);
  };

  const gameLoop = useCallback(() => {
    setGameState((prev) => {
      if (!prev.isGameActive || prev.winner || prev.isPaused) return prev;
      if (prev.countdown > 0) return prev;

      let { paddles, ball, blocks, score, mode, playerNames } = JSON.parse(JSON.stringify(prev));
      let newBallSpeed = prev.ballSpeed;
      let rallyPaddleHits = prev.rallyPaddleHits;
      let newConsecutiveStraightHits = prev.consecutiveStraightHits;
      let newBoardRotation = prev.boardRotation;
      let lastHitter = prev.lastHitter;
      let currentPointWallHits = prev.currentPointWallHits;
      let hitBlockInFlight = prev.hitBlockInFlight;
      let hasSpeedThresholdMet = prev.hasSpeedThresholdMet;
      let hasElegantoPlayed = prev.hasElegantoPlayed;
      let hasYamerooPlayed = prev.hasYamerooPlayed;

      // AUDIO CHECKS
      // 1. Light Speed
      if (newBallSpeed >= HIGH_SPEED_THRESHOLD && !hasSpeedThresholdMet) {
          playGameSound('lightspeed');
          hasSpeedThresholdMet = true;
      }
      
      // 2. Rally Milestones
      if (rallyPaddleHits === RALLY_ELEGANTO_THRESHOLD && !hasElegantoPlayed) {
          playGameSound('eleganto');
          hasElegantoPlayed = true;
      }
      
      if (rallyPaddleHits === RALLY_YAMEROO_THRESHOLD && !hasYamerooPlayed) {
          playGameSound('yameroo');
          hasYamerooPlayed = true;
      }

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

      if (newBallSpeed > MAX_BALL_SPEED) {
          newBallSpeed = MAX_BALL_SPEED;
      }

      ball.position.x += ball.velocity.x;
      ball.position.y += ball.velocity.y;

      if (ball.position.y - BALL_SIZE / 2 <= 0) {
        ball.position.y = BALL_SIZE / 2; 
        ball.velocity.y = Math.abs(ball.velocity.y); 
        if (lastHitter) currentPointWallHits++;
        playGameSound('wall');
      } else if (ball.position.y + BALL_SIZE / 2 >= GAME_HEIGHT) {
        ball.position.y = GAME_HEIGHT - BALL_SIZE / 2;
        ball.velocity.y = -Math.abs(ball.velocity.y);
        if (lastHitter) currentPointWallHits++;
        playGameSound('wall');
      }

      const checkSpeedUp = (currentHits: number) => {
          if (currentHits === RALLY_HITS_THRESHOLD) {
              return true;
          }
          if (currentHits > RALLY_HITS_THRESHOLD && 
             (currentHits - RALLY_HITS_THRESHOLD) % RALLY_HITS_INTERVAL === 0) {
              return true;
          }
          return false;
      };
      
      const isDeuce = score.player1 >= BASE_WINNING_SCORE - 1 && score.player2 >= BASE_WINNING_SCORE - 1;
      const shouldRotateOnPaddle = isDeuce || mode === 'hardcore';
      const currentTotalScore = score.player1 + score.player2;

      const isCollidingWithLeftPaddle = 
        ball.position.x - BALL_SIZE / 2 <= 20 + PADDLE_WIDTH &&
        ball.position.y > paddles.left.y &&
        ball.position.y < paddles.left.y + PADDLE_HEIGHT;

      const isCollidingWithRightPaddle =
        ball.position.x + BALL_SIZE / 2 >= GAME_WIDTH - 20 - PADDLE_WIDTH &&
        ball.position.y > paddles.right.y &&
        ball.position.y < paddles.right.y + PADDLE_HEIGHT;
      
      if (isCollidingWithLeftPaddle && ball.velocity.x < 0) {
        ball.position.x = 20 + PADDLE_WIDTH + BALL_SIZE / 2 + 1;

        lastHitter = 'player1';
        currentPointWallHits = 0;
        hitBlockInFlight = false; // Reset block tracker

        rallyPaddleHits++;
        if (checkSpeedUp(rallyPaddleHits) && currentTotalScore < MAX_PROGRESSION_SCORE) {
             newBallSpeed += BALL_SPEED_INCREMENT;
        }
        newBallSpeed = Math.min(newBallSpeed, MAX_BALL_SPEED);

        const relativeIntersectY = (paddles.left.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        let bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        
        if (Math.abs(bounceAngle) < 0.1) {
            newConsecutiveStraightHits++;
        } else {
            newConsecutiveStraightHits = 0;
        }

        if (newConsecutiveStraightHits >= 4) {
             const direction = Math.random() > 0.5 ? 1 : -1;
             bounceAngle = direction * 0.35; 
             newConsecutiveStraightHits = 0;
        }
        
        if (shouldRotateOnPaddle) {
            newBoardRotation += (Math.random() * 8 - 4); 
        }

        ball.velocity.x = newBallSpeed * Math.cos(bounceAngle);
        ball.velocity.y = newBallSpeed * -Math.sin(bounceAngle);
        playGameSound('paddle');

      } else if (isCollidingWithRightPaddle && ball.velocity.x > 0) {
        ball.position.x = GAME_WIDTH - 20 - PADDLE_WIDTH - BALL_SIZE / 2 - 1;

        lastHitter = 'player2';
        currentPointWallHits = 0;
        hitBlockInFlight = false; // Reset block tracker

        rallyPaddleHits++;
        if (checkSpeedUp(rallyPaddleHits) && currentTotalScore < MAX_PROGRESSION_SCORE) {
             newBallSpeed += BALL_SPEED_INCREMENT;
        }
        newBallSpeed = Math.min(newBallSpeed, MAX_BALL_SPEED);

        const relativeIntersectY = (paddles.right.y + PADDLE_HEIGHT / 2) - ball.position.y;
        const normalizedIntersectY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        let bounceAngle = normalizedIntersectY * MAX_BOUNCE_ANGLE;
        
        if (Math.abs(bounceAngle) < 0.1) {
            newConsecutiveStraightHits++;
        } else {
            newConsecutiveStraightHits = 0;
        }

        if (newConsecutiveStraightHits >= 4) {
             const direction = Math.random() > 0.5 ? 1 : -1;
             bounceAngle = direction * 0.35; 
             newConsecutiveStraightHits = 0;
        }
        
        if (shouldRotateOnPaddle) {
            newBoardRotation += (Math.random() * 8 - 4); 
        }

        ball.velocity.x = -newBallSpeed * Math.cos(bounceAngle);
        ball.velocity.y = newBallSpeed * -Math.sin(bounceAngle);
        playGameSound('paddle');
      }
      
      for (const block of blocks) {
        const dx = ball.position.x - (block.position.x + BLOCK_WIDTH / 2);
        const dy = ball.position.y - (block.position.y + BLOCK_HEIGHT / 2);
        const combinedHalfWidths = (BALL_SIZE + BLOCK_WIDTH) / 2;
        const combinedHalfHeights = (BALL_SIZE + BLOCK_HEIGHT) / 2;

        if (Math.abs(dx) < combinedHalfWidths && Math.abs(dy) < combinedHalfHeights) {
          const overlapX = combinedHalfWidths - Math.abs(dx);
          const overlapY = combinedHalfHeights - Math.abs(dy);

          const epsilon = 0.2; 

          if (overlapX < overlapY) {
            ball.velocity.x *= -1;
            ball.position.x += (dx > 0 ? overlapX + epsilon : -overlapX - epsilon);
          } else {
            ball.velocity.y *= -1;
            ball.position.y += (dy > 0 ? overlapY + epsilon : -overlapY - epsilon);
          }
          
          newBoardRotation += (Math.random() * 6 - 3);
          hitBlockInFlight = true; // Mark collision for Pong Point
          playGameSound('block');
          break; 
        }
      }

      let newWinner = prev.winner;
      let isMasacre = false;
      let isDramaticFinish = false;
      let isNoScope = false;
      let isPongPoint = false;
      let newCountdown = prev.countdown;
      let newDirection = prev.nextBallDirection;
      let lastScorer = prev.lastScorer;

      const handleScore = (scorer: 'player1' | 'player2') => {
          if (scorer === 'player1') {
              score.player1++;
              lastScorer = playerNames.player1;
          } else {
              score.player2++;
              lastScorer = playerNames.player2;
          }

          // Check No Scope Condition (> 3 wall hits)
          if (currentPointWallHits > 3) {
              isNoScope = true;
              playGameSound('noscope');
          } else if (hitBlockInFlight) {
              isPongPoint = true;
              playGameSound('pongpoint');
          } else {
              playGameSound('score');
          }

          newBallSpeed = getSpeedForScore(score.player1 + score.player2, mode);
          rallyPaddleHits = 0;
          newConsecutiveStraightHits = 0;
          newBoardRotation = 0;
          currentPointWallHits = 0;
          hitBlockInFlight = false;
          hasSpeedThresholdMet = false;
          hasElegantoPlayed = false;
          hasYamerooPlayed = false;

          lastHitter = null;
          ball = resetBallPosition(scorer === 'player1' ? -1 : 1); 
          newCountdown = 3;
          newDirection = scorer === 'player1' ? -1 : 1;
          paddles.left.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
          paddles.right.y = GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;
      };

      if (ball.position.x < 0) {
        handleScore('player2');
      } else if (ball.position.x > GAME_WIDTH) {
        handleScore('player1');
      }

      const totalScore = score.player1 + score.player2;
      const someoneScored = (ball.velocity.x === 0 && newCountdown === 3); 
      
      if (someoneScored && totalScore >= POINTS_TO_START_BLOCKS) {
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
              const isOverlapping = blocks.some(b => Math.abs(b.position.y - newY) < BLOCK_HEIGHT + 5);
              
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

          while (blocks.length > MAX_BLOCKS_ON_SCREEN) {
             blocks.shift();
          }
      }

      let isGameActive = prev.isGameActive;
      const scoreDiff = Math.abs(score.player1 - score.player2);
      
      if ((score.player1 >= BASE_WINNING_SCORE || score.player2 >= BASE_WINNING_SCORE) && scoreDiff >= WIN_BY_MARGIN) {
          if (score.player1 > score.player2) {
              newWinner = playerNames.player1; 
              if (score.player2 === 0) isMasacre = true;
          } else {
              newWinner = playerNames.player2; 
              if (score.player1 === 0) isMasacre = true;
          }
          isGameActive = false;

          const winningScore = Math.max(score.player1, score.player2);
          if (winningScore > BASE_WINNING_SCORE) {
              isDramaticFinish = true;
          }
          
          if (isMasacre) {
              playGameSound('masacre', newWinner);
          } else if (isDramaticFinish) {
              playGameSound('dramatic', newWinner);
          } else {
              playGameSound('win', newWinner);
          }
      }

      return { 
          ...prev, 
          paddles, 
          ball, 
          blocks, 
          score, 
          winner: newWinner, 
          isMasacre, 
          isDramaticFinish,
          isNoScope,
          isPongPoint,
          isGameActive, 
          ballSpeed: newBallSpeed,
          rallyPaddleHits,
          countdown: newCountdown,
          nextBallDirection: newDirection,
          lastScorer,
          consecutiveStraightHits: newConsecutiveStraightHits,
          boardRotation: newBoardRotation,
          lastHitter,
          currentPointWallHits,
          hitBlockInFlight,
          hasSpeedThresholdMet,
          hasElegantoPlayed,
          hasYamerooPlayed
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

  return { gameState, startGame };
};