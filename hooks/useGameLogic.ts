
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Block, GameMode, SkinType } from '../types';
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

// Helper to ensure voices are loaded (Chrome quirk)
const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }
        
        // If empty, wait for the event
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
        };
        
        // Fallback timeout in case event never fires
        setTimeout(() => resolve([]), 1000);
    });
};

// Pre-fetch voices globally to warm up the browser cache
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    getVoices().then(() => console.log("Voices warmed up"));
}

const playGameSound = (type: 'paddle' | 'wall' | 'block' | 'score' | 'win' | 'masacre' | 'noscope' | 'dramatic' | 'lightspeed' | 'pongpoint' | 'eleganto' | 'yameroo' | 'tsukuyomi' | 'explosion' | 'casi' | 'remontada' | 'sonicboom', extraData?: string) => {
  const ctx = getAudioContext();
  
  // Audio Context for SFX (Beeps and Boops)
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
      default:
        // Silence the synth fanfare for special events, only voice will play below
        break;
    }
  }

  // Text To Speech
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const isSpecial = ['win', 'masacre', 'noscope', 'dramatic', 'lightspeed', 'pongpoint', 'eleganto', 'yameroo', 'tsukuyomi', 'explosion', 'casi', 'remontada', 'sonicboom'].includes(type);
    
    if (isSpecial) {
        // Cancel any ongoing speech to prioritize game events
        window.speechSynthesis.cancel();

        // Fetch voices synchronously (should be loaded by now due to global warmup) but fallback safely
        let voices = window.speechSynthesis.getVoices();
        
        // Fallback logic
        const englishVoice = voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) || voices[0];
        const japanVoice = voices.find(v => v.lang.startsWith('ja')); 
        const esVoice = voices.find(v => v.lang.startsWith('es'));

        let text = "";
        let u1 = new SpeechSynthesisUtterance();
        
        // Default config
        u1.voice = englishVoice; // Default to English/System
        u1.rate = 0.9;
        u1.pitch = 0.6;
        u1.volume = 1.0;

        if (type === 'masacre') {
            text = `MASACRE! ... ${extraData} Wins`;
            u1.pitch = 0.4; 
        } else if (type === 'tsukuyomi') {
            text = `Caiste en el Tsukuyomi Infinito ... ${extraData} Wins`;
            u1.pitch = 0.1; 
            u1.rate = 0.8; 
            if (esVoice) u1.voice = esVoice;
            else if (japanVoice) u1.voice = japanVoice;
        } else if (type === 'remontada') {
            text = `Una victoria desde el principio, no, desde cero ... ${extraData} Wins`;
            u1.pitch = 1.1; 
            u1.rate = 0.85; 
            if (esVoice) u1.voice = esVoice;
        } else if (type === 'explosion') {
            text = `EXPLOOOOOSION!! ... ${extraData} Wins`;
            u1.pitch = 1.4; // High pitch like Megumin
            u1.rate = 1.0;
        } else if (type === 'sonicboom') {
            text = `SONIC BOOM! ... ${extraData} Wins`;
            u1.pitch = 1.2; 
            u1.rate = 1.4; // Fast
        } else if (type === 'casi') {
            text = `Casi te gano! ... ${extraData} Wins`; 
            u1.pitch = 1.2; 
            u1.rate = 1.1;
            if (esVoice) u1.voice = esVoice;
        } else if (type === 'dramatic') {
            text = `DRAMATIC FINISH! ... ${extraData} Wins`;
            u1.pitch = 0.2; 
            u1.rate = 0.6; 
        } else if (type === 'noscope') {
            text = "NO SCOPE!"; // Mid-game, don't say winner yet
            u1.pitch = 1.5; 
            u1.rate = 1.2;
        } else if (type === 'pongpoint') {
            text = "PONG POINT!";
            u1.pitch = 0.1; 
            u1.rate = 1.1;
        } else if (type === 'lightspeed') {
            text = "Light speedo!!";
            u1.pitch = 1.4; 
            u1.rate = 1.4;
        } else if (type === 'eleganto') {
            text = "Elegan-to!";
            u1.pitch = 0.8; 
            if (japanVoice) u1.voice = japanVoice; 
        } else if (type === 'yameroo') {
            text = "Yameroo Freeza!";
            u1.pitch = 1.2; 
            u1.rate = 1.1;
            if (japanVoice) u1.voice = japanVoice; 
        } else {
            // NORMAL WIN
            text = `${extraData} Wins`;
        }

        u1.text = text;
        
        // Final safety check before speaking
        if (u1.voice) {
            window.speechSynthesis.speak(u1);
        } else {
            // Last resort if no voice object matches
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        }
    }
  }
};

const createInitialState = (mode: GameMode = 'classic', p1Name: string = 'Player 1', p2Name: string = 'Player 2', p1Skin: SkinType = 'default', p2Skin: SkinType = 'default'): GameState => ({
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
  skins: { player1: p1Skin, player2: p2Skin },
  isGameActive: false,
  isPaused: false,
  winner: null,
  isMasacre: false,
  isDramaticFinish: false,
  isNoScope: false,
  isPongPoint: false,
  isTsukuyomi: false,
  isExplosion: false,
  isSonicBoom: false,
  isNearMiss: false,
  isRemontada: false,
  ballSpeed: mode === 'hardcore' ? HARDCORE_INITIAL_BALL_SPEED : INITIAL_BALL_SPEED,
  rallyPaddleHits: 0,
  countdown: 0,
  nextBallDirection: 0,
  lastScorer: null,
  lastScorerId: null,
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

interface MatchResult {
    winner: string;
    loser: string;
}

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const keysPressed = useRef<Record<string, boolean>>({});
  const animationFrameId = useRef<number>();
  const matchHistory = useRef<MatchResult[]>([]); 
  
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startGame = useCallback((mode: GameMode = 'classic', p1Name: string, p2Name: string, p1Skin: SkinType, p2Skin: SkinType) => {
    // 1. Resume Audio Context
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    
    // 2. Resume/Load Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // This acts as a "user gesture" to unlock speech on mobile/safari
        window.speechSynthesis.cancel(); 
        getVoices(); // Trigger voice loading
    }

    const startDir = Math.random() > 0.5 ? 1 : -1;
    setGameState(prev => ({
        ...createInitialState(mode, p1Name, p2Name, p1Skin, p2Skin), 
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
             // Reset scorer ID when round starts so image disappears
             prev.lastScorerId = null; 
             isNoScope = false;
             isPongPoint = false;
          }

          return {
            ...prev,
            countdown: newCount,
            ball: newBall,
            lastScorer,
            lastScorerId: prev.lastScorerId, // Ensure we keep it null if reset above
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

      let { paddles, ball, blocks, score, mode, playerNames, skins } = JSON.parse(JSON.stringify(prev));
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
      if (newBallSpeed >= HIGH_SPEED_THRESHOLD && !hasSpeedThresholdMet) {
          playGameSound('lightspeed');
          hasSpeedThresholdMet = true;
      }
      
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
        hitBlockInFlight = false; 

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
        hitBlockInFlight = false; 

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
          hitBlockInFlight = true; 
          playGameSound('block');
          break; 
        }
      }

      let newWinner = prev.winner;
      let isMasacre = false;
      let isDramaticFinish = false;
      let isNoScope = false;
      let isPongPoint = false;
      let isTsukuyomi = false;
      let isExplosion = false;
      let isSonicBoom = false;
      let isNearMiss = false;
      let isRemontada = false;

      let newCountdown = prev.countdown;
      let newDirection = prev.nextBallDirection;
      let lastScorer = prev.lastScorer;
      let lastScorerId = prev.lastScorerId;

      const handleScore = (scorer: 'player1' | 'player2') => {
          if (scorer === 'player1') {
              score.player1++;
              lastScorer = playerNames.player1;
              lastScorerId = 'player1';
          } else {
              score.player2++;
              lastScorer = playerNames.player2;
              lastScorerId = 'player2';
          }

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
          let loserScore = 0;
          let winnerScore = 0;
          let loserName = '';

          if (score.player1 > score.player2) {
              newWinner = playerNames.player1; 
              winnerScore = score.player1;
              loserScore = score.player2;
              loserName = playerNames.player2;
          } else {
              newWinner = playerNames.player2; 
              winnerScore = score.player2;
              loserScore = score.player1;
              loserName = playerNames.player1;
          }

          // --- CHECK SPECIAL WIN CONDITIONS ---
          
          // 1. Masacre (5-0)
          if (loserScore === 0) isMasacre = true;

          // 2. Explosion (Konosuba 5-3)
          if (winnerScore >= 5 && loserScore === 3) isExplosion = true;

          // 3. Sonic Boom (5-2)
          if (winnerScore >= 5 && loserScore === 2) isSonicBoom = true;

          // 4. Near Miss (5-1)
          if (winnerScore >= 5 && loserScore === 1) isNearMiss = true;
          
          // 5. Remontada
          if (loserScore >= 4 && !isMasacre) isRemontada = true;

          // 6. Dramatic Finish (Overtime)
          if (winnerScore > BASE_WINNING_SCORE) {
              isDramaticFinish = true;
          }

          // 7. Tsukuyomi (3 wins in a row)
          const history = matchHistory.current;
          const last1 = history[history.length - 1];
          const last2 = history[history.length - 2];

          if (last1 && last2 && 
              last1.winner === newWinner && last1.loser === loserName &&
              last2.winner === newWinner && last2.loser === loserName) {
              isTsukuyomi = true;
          }

          matchHistory.current.push({ winner: newWinner, loser: loserName });

          isGameActive = false;

          // Priority Audio Trigger
          if (isTsukuyomi) {
              playGameSound('tsukuyomi', newWinner);
          } else if (isMasacre) {
              playGameSound('masacre', newWinner);
          } else if (isSonicBoom) {
              playGameSound('sonicboom', newWinner);
          } else if (isExplosion) {
              playGameSound('explosion', newWinner);
          } else if (isRemontada) {
              playGameSound('remontada', newWinner);
          } else if (isNearMiss) {
              playGameSound('casi', newWinner);
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
          isTsukuyomi,
          isExplosion,
          isSonicBoom,
          isNearMiss,
          isRemontada,
          isGameActive, 
          ballSpeed: newBallSpeed, 
          rallyPaddleHits, 
          countdown: newCountdown, 
          nextBallDirection: newDirection, 
          lastScorer, 
          lastScorerId,
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
