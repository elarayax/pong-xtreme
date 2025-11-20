
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

// Define available skin keys
export type SkinType = 
  | 'default' 
  | 'frog' 
  | 'sonic' 
  | 'batman' 
  | 'superman' 
  | 'ironman' 
  | 'stormtrooper' 
  | 'saiyan' 
  | 'mando' 
  | 'panda';

export interface GameState {
  paddles: { left: Paddle; right: Paddle };
  ball: Ball;
  blocks: Block[];
  score: { player1: number; player2: number };
  playerNames: { player1: string; player2: string };
  skins: { player1: SkinType; player2: SkinType }; // New: Track selected skins
  isGameActive: boolean;
  isPaused: boolean;
  winner: string | null;
  isMasacre: boolean;
  isDramaticFinish: boolean;
  isNoScope: boolean;
  isPongPoint: boolean;
  ballSpeed: number;
  rallyPaddleHits: number;
  countdown: number;
  nextBallDirection: number;
  lastScorer: string | null;
  consecutiveStraightHits: number;
  boardRotation: number;
  mode: GameMode;
  lastHitter: 'player1' | 'player2' | null;
  currentPointWallHits: number;
  hitBlockInFlight: boolean;
  hasSpeedThresholdMet: boolean;
  hasElegantoPlayed: boolean;
  hasYamerooPlayed: boolean;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  isMasacre: boolean;
  date: string;
}
