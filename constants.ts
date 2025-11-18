
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 100;
export const PADDLE_SPEED = 8;

export const BALL_SIZE = 15;
export const INITIAL_BALL_SPEED = 7;
export const BALL_SPEED_INCREMENT = 0.5;

// New Speed Logic
export const RALLY_HITS_THRESHOLD = 5; // Start speeding up after 5 hits
export const RALLY_HITS_INTERVAL = 2;  // Then speed up every 2 hits

export const MAX_BOUNCE_ANGLE = Math.PI / 4; // 45 degrees

export const BLOCK_WIDTH = 15;
export const BLOCK_HEIGHT = 40;
export const POINTS_TO_START_BLOCKS = 2; // Blocks start appearing when total score is >= 2

export const BASE_WINNING_SCORE = 5;
export const WIN_BY_MARGIN = 2;

export const MAX_PROGRESSION_SCORE = 7; // Stop increasing difficulty after 7 total points