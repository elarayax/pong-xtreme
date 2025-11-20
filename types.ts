
export interface Vector {
  x: number;
  y: number;
}

export interface Paddle {
  y: number;
}

export interface Ball {
  position: Vector;
  velocity: Vector;
}

export interface Block {
  position: Vector;
}

export type GameMode = 'classic' | 'hardcore';

export interface GameState {
  paddles: { left: Paddle; right: Paddle };
  ball: Ball;
  blocks: Block[];
  score: { player1: number; player2: number };
  playerNames: { player1: string; player2: string };
  isGameActive: boolean;
  isPaused: boolean;
  winner: string | null;
  isMasacre: boolean;
  isDramaticFinish: boolean; // New: For DBZ style finish
  isNoScope: boolean; // New: For trick shots
  ballSpeed: number;
  rallyPaddleHits: number;
  countdown: number;
  nextBallDirection: number;
  lastScorer: string | null;
  consecutiveStraightHits: number;
  boardRotation: number;
  mode: GameMode;
  lastHitter: 'player1' | 'player2' | null; // Track who hit ball last for No Scope
  currentPointWallHits: number; // Track bounces for No Scope
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  isMasacre: boolean;
  date: string;
}
