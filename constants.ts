
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
    img: 'https://64.media.tumblr.com/d9a675b2ad0263037f4c74695a03ceff/tumblr_ns312s04zS1tu022ro2_1280.png'
  },
  sonic: { 
    name: 'Hedgehog', 
    icon: '🦔', 
    bg: 'bg-blue-600', 
    border: 'border-blue-800', 
    glow: 'shadow-blue-400',
    img: 'https://media.tenor.com/9yvXHMTiUcYAAAAj/sonic-the-hedgehog-dancing.gif'
  },
  batman: { 
    name: 'Dark Knight', 
    icon: '🦇', 
    bg: 'bg-gray-900', 
    border: 'border-yellow-500', 
    glow: 'shadow-yellow-600',
    img: 'https://pngdownload.io/wp-content/uploads/2024/04/Batman-DC-Comics-superhero-transparent-PNG-image-768x576.webp'
  },
  superman: { 
    name: 'Man of Steel', 
    icon: '🦸‍♂️', 
    bg: 'bg-blue-600', 
    border: 'border-red-600', 
    glow: 'shadow-red-500',
    img: 'https://media.tenor.com/CMfiajknCOcAAAAM/evil-superman.gif'
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
    img: 'https://media.tenor.com/zcsiS7sOGrwAAAAM/501st-star-wars.gif'
  },
  saiyan: { 
    name: 'Saiyan God', 
    icon: '🔥', 
    bg: 'bg-yellow-400', 
    border: 'border-orange-600', 
    glow: 'shadow-yellow-300',
    img: 'https://dthezntil550i.cloudfront.net/1z/latest/1z2106291344089220021176382/b00102ec-5608-4117-a0bb-09fbf3e31268.png' 
  },
  mando: { 
    name: 'Mandalorian', 
    icon: '🛡️', 
    bg: 'bg-gray-400', 
    border: 'border-gray-600', 
    glow: 'shadow-gray-300',
    img: 'https://w7.pngwing.com/pngs/269/626/png-transparent-person-holding-sword-illustration-t-shirt-the-mandalorian-armor-boba-fett-samurai-poster-anakin-skywalker-top-thumbnail.png'
  },
  panda: { 
    name: 'Kung Fu', 
    icon: '🐼', 
    bg: 'bg-white', 
    border: 'border-black', 
    glow: 'shadow-white',
    img: 'https://i.pinimg.com/originals/a6/4b/e2/a64be27204aeb61ce9e156c9e47231c1.gif'
  },
  emilia: {
    name: 'Emilia-tan',
    icon: '❄️',
    bg: 'bg-purple-100',
    border: 'border-purple-600',
    glow: 'shadow-purple-300',
    img: 'https://i.pinimg.com/originals/49/24/58/492458b6b07d19f6ccb1f15f2931b121.gif'
  }
};
