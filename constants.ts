
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 100;
export const PADDLE_SPEED = 11;

export const BALL_SIZE = 15;
export const INITIAL_BALL_SPEED = 7;
export const HARDCORE_INITIAL_BALL_SPEED = 10;
export const BALL_SPEED_INCREMENT = 0.5;
export const MAX_BALL_SPEED = 14;
export const HIGH_SPEED_THRESHOLD = 12.5;

export const RALLY_HITS_THRESHOLD = 5;
export const RALLY_HITS_INTERVAL = 2;
export const RALLY_ELEGANTO_THRESHOLD = 10;
export const RALLY_YAMEROO_THRESHOLD = 20;

export const MAX_BOUNCE_ANGLE = Math.PI / 4;

export const BLOCK_WIDTH = 20; 
export const BLOCK_HEIGHT = 40;
export const POINTS_TO_START_BLOCKS = 2;
export const MAX_BLOCKS_ON_SCREEN = 5;

export const BASE_WINNING_SCORE = 5;
export const WIN_BY_MARGIN = 2;
export const MAX_PROGRESSION_SCORE = 5;

// --- SKINS CONFIGURATION ---
export const AVAILABLE_SKINS = {
  default: { 
    name: 'Classic', 
    icon: '', 
    bg: null, 
    border: null, 
    glow: null,
    img: null
  },
  frog: { 
    name: 'Froggy', 
    icon: '🐸', 
    bg: 'bg-green-500', 
    border: 'border-green-700', 
    glow: 'shadow-green-400',
    img: 'https://cdn-icons-png.flaticon.com/512/616/616408.png'
  },
  sonic: { 
    name: 'Hedgehog', 
    icon: '🦔', 
    bg: 'bg-blue-600', 
    border: 'border-blue-800', 
    glow: 'shadow-blue-400',
    img: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c8/Sonic_the_Hedgehog_screen_shot.png/220px-Sonic_the_Hedgehog_screen_shot.png'
  },
  batman: { 
    name: 'Dark Knight', 
    icon: '🦇', 
    bg: 'bg-gray-900', 
    border: 'border-yellow-500', 
    glow: 'shadow-yellow-600',
    img: 'https://upload.wikimedia.org/wikipedia/en/1/17/Batman-BenAffleck.jpg'
  },
  superman: { 
    name: 'Man of Steel', 
    icon: '🦸‍♂️', 
    bg: 'bg-blue-600', 
    border: 'border-red-600', 
    glow: 'shadow-red-500',
    img: 'https://upload.wikimedia.org/wikipedia/en/3/35/Supermanflying.png'
  },
  ironman: { 
    name: 'Iron Tech', 
    icon: '🤖', 
    bg: 'bg-red-700', 
    border: 'border-yellow-400', 
    glow: 'shadow-yellow-500',
    img: 'https://upload.wikimedia.org/wikipedia/en/4/47/Iron_Man_%28circa_2018%29.png'
  },
  stormtrooper: { 
    name: 'Trooper', 
    icon: '💀', 
    bg: 'bg-white', 
    border: 'border-gray-800', 
    glow: 'shadow-white',
    img: 'https://upload.wikimedia.org/wikipedia/en/0/04/Stormtrooper_2.jpg'
  },
  saiyan: { 
    name: 'Saiyan God', 
    icon: '🔥', 
    bg: 'bg-yellow-400', 
    border: 'border-orange-600', 
    glow: 'shadow-yellow-300',
    img: 'https://upload.wikimedia.org/wikipedia/en/3/31/Goku-character_profile.png' 
  },
  mando: { 
    name: 'Mandalorian', 
    icon: '🛡️', 
    bg: 'bg-gray-400', 
    border: 'border-gray-600', 
    glow: 'shadow-gray-300',
    img: 'https://upload.wikimedia.org/wikipedia/en/a/a1/The_Mandalorian_character.jpg'
  },
  panda: { 
    name: 'Kung Fu', 
    icon: '🐼', 
    bg: 'bg-white', 
    border: 'border-black', 
    glow: 'shadow-white',
    img: 'https://upload.wikimedia.org/wikipedia/en/7/76/Kungfupanda.jpg'
  },
  emilia: {
    name: 'Emilia-tan',
    icon: '❄️',
    bg: 'bg-purple-100',
    border: 'border-purple-600',
    glow: 'shadow-purple-300',
    img: 'https://upload.wikimedia.org/wikipedia/en/3/36/Emilia_Re_Zero_anime.png'
  }
};
