// Ember Pass Kitchen — the field, the palette and the kitchen layout.
// One job: every number the rest of the game agrees on, so a station moved here
// moves everywhere (engine, renderer, shots and input all read these rects).

export const FIELD_W = 1280;
export const FIELD_H = 720;
export const RUSH_SECONDS = 90;
export const BEST_KEY = 'ember-pass-kitchen-best';
export const STEP = 1 / 60;

// The chef walks the floor and reaches a station from up to this far away.
export const REACH = 110;
export const CHEF_SPEED = 300;
export const CHEF_RADIUS = 20;

// Chopping one ingredient takes this long on a board; a pot burns this long
// after it finishes cooking before the dish is ruined.
export const CHOP_SECONDS = 1.5;
export const BURN_SECONDS = 8;
export const CARRY_MAX = 3;
export const MAX_TICKETS = 4;

export const PALETTE = {
  floor: '#c98f4e',
  floorDark: '#b57e42',
  wall: '#7a4a2b',
  board: '#2e1f16',
  boardEdge: '#4a3220',
  counter: '#8a5a33',
  counterTop: '#a9743f',
  steel: '#b9c4cc',
  steelDark: '#7d8b96',
  cream: '#fff3d6',
  ink: '#241708',
  tomato: '#e8442e',
  gold: '#ffc93c',
  green: '#4caf50',
  red: '#d32f2f',
  flame: '#ff7a1a',
};

export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', color: '#e8442e', dark: '#a92a1c', chop: true },
  { id: 'onion', name: 'Onion', color: '#f2e6c9', dark: '#c9b48a', chop: true },
  { id: 'mushroom', name: 'Mushroom', color: '#d8c1a3', dark: '#9c8468', chop: true },
  { id: 'lettuce', name: 'Lettuce', color: '#5da83c', dark: '#3c7a26', chop: true },
  { id: 'carrot', name: 'Carrot', color: '#ff8c1a', dark: '#c96a08', chop: true },
  { id: 'egg', name: 'Egg', color: '#fff8dc', dark: '#d9c98f', chop: false },
  { id: 'cheese', name: 'Cheese', color: '#ffc93c', dark: '#d99e06', chop: false },
  { id: 'pasta', name: 'Pasta', color: '#f7d774', dark: '#c9a83c', chop: false },
];

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((item) => [item.id, item]));

// Ingredient bins along the top counter, left to right.
export const BIN_W = 96;
export const BIN_H = 64;
export const BINS = INGREDIENTS.map((item, i) => ({
  id: item.id,
  x: 16 + i * (BIN_W + 4),
  y: 100,
  w: BIN_W,
  h: BIN_H,
}));

// Two chopping boards on the left wall.
export const CHOP_BOARDS = [
  { x: 32, y: 216, w: 190, h: 96 },
  { x: 32, y: 344, w: 190, h: 96 },
];

// The stove: four burners in a 2x2 grid, the heart of the burn-juggling.
export const STOVE = { x: 288, y: 216, w: 372, h: 224 };
export const BURNERS = [
  { x: 308, y: 232, w: 160, h: 96 },
  { x: 488, y: 232, w: 160, h: 96 },
  { x: 308, y: 344, w: 160, h: 96 },
  { x: 488, y: 344, w: 160, h: 96 },
];

// Two plate slots on the plating counter.
export const PLATE_COUNTER = { x: 724, y: 216, w: 236, h: 224 };
export const PLATES = [
  { x: 744, y: 240, w: 196, h: 88 },
  { x: 744, y: 344, w: 196, h: 88 },
];

// Serve window (right of the bins) and the trash bin.
export const SERVE_WINDOW = { x: 1024, y: 100, w: 240, h: 64 };
export const TRASH = { x: 1024, y: 216, w: 120, h: 96 };

export const CHEF_START = { x: 640, y: 560 };

/** Centre of a rect, for distance checks and drawing. */
export function rectCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}
