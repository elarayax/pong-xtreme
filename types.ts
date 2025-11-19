
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
  isGameActive: boolean;
  isPaused: boolean;
  winner: string | null;
  isMasacre: boolean;
  ballSpeed: number;
  rallyPaddleHits: number;
  countdown: number;
  nextBallDirection: number;
  lastScorer: string | null;
  consecutiveStraightHits: number;
  boardRotation: number;
  mode: GameMode;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  isMasacre: boolean;
  date: string;
}
