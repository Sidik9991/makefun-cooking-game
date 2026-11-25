// Ember Pass Kitchen — every pixel the judge sees, drawn on one canvas.
// One job: paint the kitchen, the food, the chef and the rush from state.
// Food is drawn from code (no images): a tomato reads as a tomato at a glance.

import {
  BINS, BURNERS, CHOP_BOARDS, FIELD_H, FIELD_W, PALETTE, PLATES, PLATE_COUNTER,
  RUSH_SECONDS, SERVE_WINDOW, STOVE, TRASH, INGREDIENT_BY_ID, rectCenter,
} from './config.js';
import { RECIPE_BY_ID } from './recipes.js';
import { nearestStation } from './engine.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const TITLE = 'EMBER PASS KITCHEN';
const TAGLINE = 'Juggle the burn — 4 burners, 12 recipes, 3 stations, 90-second rush';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One ingredient, drawn as food: chopped ones come as scattered pieces. */
export function drawIngredient(ctx, id, x, y, r, chopped = false) {
  const item = INGREDIENT_BY_ID.get(id);
  if (!item) return;
  if (chopped) {
    ctx.fillStyle = item.color;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = item.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }
  ctx.fillStyle = item.color;
  ctx.strokeStyle = item.dark;
  ctx.lineWidth = 2;
  if (id === 'carrot') {
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.4);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x - r, y + r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3c7a26';
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.4);
    ctx.lineTo(x - r - r * 0.7, y - r);
    ctx.lineTo(x - r - r * 0.2, y - r * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'mushroom') {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.2, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2e6c9';
    ctx.fillRect(x - r * 0.25, y - r * 0.2, r * 0.5, r * 0.7);
  } else if (id === 'egg') {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffbf00';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cheese') {
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.6);
    ctx.lineTo(x - r, y - r * 0.2);
    ctx.lineTo(x + r, y - r * 0.6);
    ctx.lineTo(x + r, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = item.dark;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y, r * 0.16, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y + r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'pasta') {
    ctx.strokeStyle = item.dark;
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x, y + i * r * 0.45, r * 0.55, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = item.color;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(x + (i - 1) * r * 0.5, y, r * 0.55, r * 0.75, (i - 1) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = item.dark;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (id === 'tomato') {
      ctx.fillStyle = '#3c7a26';
      ctx.beginPath();
      ctx.ellipse(x, y - r, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (id === 'onion') {
      ctx.strokeStyle = '#c9b48a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** A finished dish on a plate: white plate, the recipe's ingredients on top. */
function drawDish(ctx, recipeId, x, y, r) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  ctx.fillStyle = '#f8f8f8';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!recipe) return;
  recipe.needs.forEach((id, i) => {
    const a = (i / recipe.needs.length) * Math.PI * 2 - Math.PI / 2;
    drawIngredient(ctx, id, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, r * 0.34, recipe.chop.includes(id));
  });
  if (recipe) text(ctx, recipe.name, x, y + r + 12, 11, PALETTE.cream);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = FIELD_W * dpr;
  canvas.height = FIELD_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const particles = [];

  function burst(x = FIELD_W / 2, y = FIELD_H / 2, n = 90) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 420,
        vy: -Math.random() * 320 - 60,
        color: ['#ffc93c', '#e8442e', '#5da83c', '#fff3d6', '#ff7a1a'][i % 5],
        life: 1.4 + Math.random(),
        size: 3 + Math.random() * 5,
      });
    }
  }

  function updateAnimations(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  /** Map a client point on the canvas to field coordinates. */
  function toField(point) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((point.x - rect.left) / rect.width) * FIELD_W,
      y: ((point.y - rect.top) / rect.height) * FIELD_H,
    };
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 176, FIELD_W, FIELD_H - 176);
    ctx.fillStyle = PALETTE.floorDark;
    for (let y = 176; y < FIELD_H; y += 64) {
      for (let x = ((y / 64) % 2) * 32; x < FIELD_W; x += 64) {
        ctx.fillRect(x, y, 60, 60);
      }
    }
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 164, FIELD_W, 12);
  }

  function drawOrderBoard(kitchen) {
    ctx.fillStyle = PALETTE.board;
    ctx.fillRect(0, 0, FIELD_W, 88);
    ctx.fillStyle = PALETTE.boardEdge;
    ctx.fillRect(0, 88, FIELD_W, 4);
    text(ctx, 'ORDER BOARD', 16, 18, 13, PALETTE.gold, 'left');
    kitchen.tickets.forEach((ticket, i) => {
      const recipe = RECIPE_BY_ID.get(ticket.recipeId);
      const x = 16 + i * 208;
      const urgent = ticket.secondsLeft < 12;
      ctx.fillStyle = urgent ? '#5a1f16' : '#3d2b18';
      roundRect(ctx, x, 28, 196, 52, 8);
      ctx.fill();
      ctx.strokeStyle = urgent ? '#ff5a3c' : '#8a6a3f';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, recipe?.name ?? ticket.recipeId, x + 10, 42, 13, PALETTE.cream, 'left');
      const barW = 176;
      ctx.fillStyle = '#241708';
      ctx.fillRect(x + 10, 58, barW, 10);
      ctx.fillStyle = urgent ? '#ff5a3c' : '#4caf50';
      ctx.fillRect(x + 10, 58, barW * Math.max(0, ticket.secondsLeft / ticket.total), 10);
      text(ctx, `${Math.ceil(ticket.secondsLeft)}s`, x + 186, 63, 12, PALETTE.cream, 'right');
    });
    if (kitchen.tickets.length === 0) text(ctx, 'No orders — breathe…', 16, 54, 14, '#c9a06a', 'left');
    // Timer and score, right side.
    const t = kitchen.timeLeft;
    const low = t <= 10;
    text(ctx, `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, 1010, 34, 34, low ? '#ff5a3c' : PALETTE.cream);
    ctx.fillStyle = '#241708';
    ctx.fillRect(920, 56, 180, 10);
    ctx.fillStyle = low ? '#ff5a3c' : PALETTE.gold;
    ctx.fillRect(920, 56, 180 * (t / RUSH_SECONDS), 10);
    text(ctx, `SCORE ${kitchen.score}`, 1130, 34, 18, PALETTE.gold, 'left');
    text(ctx, kitchen.combo > 1 ? `COMBO x${kitchen.combo}` : ' ', 1130, 58, 13, '#ff9a3c', 'left');
  }

  function drawBins() {
    BINS.forEach((bin) => {
      const item = INGREDIENT_BY_ID.get(bin.id);
      ctx.fillStyle = PALETTE.counter;
      roundRect(ctx, bin.x, bin.y, bin.w, bin.h, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.counterTop;
      roundRect(ctx, bin.x + 4, bin.y + 4, bin.w - 8, bin.h - 8, 6);
      ctx.fill();
      drawIngredient(ctx, bin.id, bin.x + bin.w / 2, bin.y + 26, 17);
      text(ctx, item.name, bin.x + bin.w / 2, bin.y + 54, 11, PALETTE.ink);
    });
  }

  function drawBoards(kitchen) {
    CHOP_BOARDS.forEach((board, i) => {
      ctx.fillStyle = '#6d4c2f';
      roundRect(ctx, board.x, board.y, board.w, board.h, 8);
      ctx.fill();
      ctx.fillStyle = '#e8c99a';
      roundRect(ctx, board.x + 8, board.y + 8, board.w - 16, board.h - 16, 6);
      ctx.fill();
      text(ctx, 'CHOP', board.x + board.w / 2, board.y + 14, 11, '#8a6a3f');
      const slot = kitchen.boards[i];
      if (slot.item) {
        drawIngredient(ctx, slot.item.id, board.x + board.w / 2, board.y + board.h / 2 + 6, 26, slot.item.chopped);
        if (!slot.item.chopped) {
          ctx.fillStyle = '#241708';
          ctx.fillRect(board.x + 20, board.y + board.h - 16, board.w - 40, 8);
          ctx.fillStyle = PALETTE.gold;
          ctx.fillRect(board.x + 20, board.y + board.h - 16, (board.w - 40) * Math.min(1, slot.progress / 1.5), 8);
        } else {
          text(ctx, 'CHOPPED ✓', board.x + board.w / 2, board.y + board.h - 12, 11, '#3c7a26');
        }
      } else {
        text(ctx, 'empty — bring food to chop', board.x + board.w / 2, board.y + board.h / 2 + 8, 12, '#8a6a3f');
      }
    });
  }

  function drawStove(kitchen) {
    ctx.fillStyle = PALETTE.steelDark;
    roundRect(ctx, STOVE.x, STOVE.y, STOVE.w, STOVE.h, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.steel;
    roundRect(ctx, STOVE.x + 6, STOVE.y + 6, STOVE.w - 12, STOVE.h - 12, 8);
    ctx.fill();
    text(ctx, 'STOVE — JUGGLE THE BURN', STOVE.x + STOVE.w / 2, STOVE.y - 12, 11, PALETTE.gold);
    BURNERS.forEach((burner, i) => {
      const pot = kitchen.pots[i];
      const c = rectCenter(burner);
      ctx.fillStyle = '#3a3f45';
      ctx.beginPath();
      ctx.arc(c.x, c.y + 8, 52, 0, Math.PI * 2);
      ctx.fill();
      if (pot.state === 'cooking' || (pot.state === 'ready' && pot.burnLeft !== null)) {
        ctx.fillStyle = pot.state === 'ready' && pot.burnLeft < 3 ? '#ff3c1a' : PALETTE.flame;
        ctx.beginPath();
        ctx.arc(c.x, c.y + 8, 58, 0, Math.PI * 2);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      // The pot.
      ctx.fillStyle = '#5a6068';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 8, 46, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pot.state === 'burnt' ? '#1c1c1c' : '#8a6a3f';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 2, 40, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      if (pot.state === 'burnt') {
        text(ctx, 'BURNT!', c.x, c.y - 34, 14, '#ff5a3c');
        text(ctx, 'E to scrape', c.x, c.y + 34, 10, PALETTE.cream);
      } else if (pot.state === 'cooking') {
        const recipe = RECIPE_BY_ID.get(pot.recipeId);
        const seconds = recipe?.cookSeconds ?? 1;
        ctx.fillStyle = '#241708';
        ctx.fillRect(c.x - 38, c.y - 30, 76, 8);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(c.x - 38, c.y - 30, 76 * Math.min(1, pot.progress / seconds), 8);
        text(ctx, recipe?.name ?? '', c.x, c.y + 34, 11, PALETTE.cream);
      } else if (pot.state === 'ready') {
        const recipe = RECIPE_BY_ID.get(pot.recipeId);
        text(ctx, 'READY!', c.x, c.y - 34, 14, pot.burnLeft !== null && pot.burnLeft < 3 ? '#ff5a3c' : '#7dff8a');
        if (pot.burnLeft !== null) {
          ctx.fillStyle = '#241708';
          ctx.fillRect(c.x - 38, c.y - 22, 76, 8);
          ctx.fillStyle = pot.burnLeft < 3 ? '#ff3c1a' : PALETTE.flame;
          ctx.fillRect(c.x - 38, c.y - 22, 76 * Math.max(0, pot.burnLeft / 8), 8);
        }
        text(ctx, recipe?.name ?? '', c.x, c.y + 34, 11, PALETTE.cream);
      } else if (pot.items.length > 0) {
        pot.items.forEach((item, j) => drawIngredient(ctx, item.id, c.x - 20 + j * 20, c.y + 2, 11, item.chopped));
        text(ctx, 'filling…', c.x, c.y + 34, 11, PALETTE.cream);
      } else {
        text(ctx, 'empty burner', c.x, c.y + 34, 11, '#7d8b96');
      }
    });
  }

  function drawPlates(kitchen) {
    ctx.fillStyle = PALETTE.counter;
    roundRect(ctx, PLATE_COUNTER.x, PLATE_COUNTER.y, PLATE_COUNTER.w, PLATE_COUNTER.h, 10);
    ctx.fill();
    text(ctx, 'PLATING', PLATE_COUNTER.x + PLATE_COUNTER.w / 2, PLATE_COUNTER.y + 14, 11, PALETTE.cream);
    PLATES.forEach((plate, i) => {
      const dish = kitchen.plates[i];
      ctx.fillStyle = '#f8f8f8';
      ctx.beginPath();
      ctx.ellipse(plate.x + plate.w / 2, plate.y + plate.h / 2 + 6, 78, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c8c8c8';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (dish) drawDish(ctx, dish, plate.x + plate.w / 2, plate.y + plate.h / 2 + 2, 26);
      else text(ctx, 'plate', plate.x + plate.w / 2, plate.y + plate.h / 2 + 6, 12, '#9a9a9a');
    });
  }

  function drawServeAndTrash(kitchen) {
    ctx.fillStyle = '#2f6b2f';
    roundRect(ctx, SERVE_WINDOW.x, SERVE_WINDOW.y, SERVE_WINDOW.w, SERVE_WINDOW.h, 8);
    ctx.fill();
    ctx.fillStyle = '#3f8a3f';
    roundRect(ctx, SERVE_WINDOW.x + 4, SERVE_WINDOW.y + 4, SERVE_WINDOW.w - 8, SERVE_WINDOW.h - 8, 6);
    ctx.fill();
    text(ctx, '▲  SERVE HERE  ▲', SERVE_WINDOW.x + SERVE_WINDOW.w / 2, SERVE_WINDOW.y + 20, 15, '#eaffea');
    text(ctx, 'carry a finished dish, press E', SERVE_WINDOW.x + SERVE_WINDOW.w / 2, SERVE_WINDOW.y + 44, 11, '#cfe8cf');
    ctx.fillStyle = '#4a4a4a';
    roundRect(ctx, TRASH.x, TRASH.y, TRASH.w, TRASH.h, 8);
    ctx.fill();
    ctx.fillStyle = '#333';
    roundRect(ctx, TRASH.x + 8, TRASH.y + 8, TRASH.w - 16, TRASH.h - 16, 6);
    ctx.fill();
    text(ctx, '🗑 TRASH', TRASH.x + TRASH.w / 2, TRASH.y + 26, 14, '#ddd');
    text(ctx, 'Q tosses what', TRASH.x + TRASH.w / 2, TRASH.y + 50, 11, '#aaa');
    text(ctx, 'you carry', TRASH.x + TRASH.w / 2, TRASH.y + 66, 11, '#aaa');
  }

  function drawChef(kitchen) {
    const chef = kitchen.chef;
    const bob = chef.moving ? Math.sin(performance.now() / 90) * 2 : 0;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(chef.x, chef.y + 20, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body (apron) and head.
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(chef.x, chef.y + 8 + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8442e';
    ctx.fillRect(chef.x - 18, chef.y + 2 + bob, 36, 14);
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(chef.x, chef.y - 12 + bob, 13, 0, Math.PI * 2);
    ctx.fill();
    // Chef hat.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(chef.x - 8, chef.y - 24 + bob, 8, 0, Math.PI * 2);
    ctx.arc(chef.x, chef.y - 28 + bob, 9, 0, Math.PI * 2);
    ctx.arc(chef.x + 8, chef.y - 24 + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(chef.x - 13, chef.y - 24 + bob, 26, 6);
    // Carried items float above the hat.
    kitchen.carried.forEach((item, i) => {
      const cx = chef.x - (kitchen.carried.length - 1) * 16 + i * 32;
      const cy = chef.y - 48 + bob;
      if (item.kind === 'dish') {
        ctx.fillStyle = '#f8f8f8';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const recipe = RECIPE_BY_ID.get(item.id);
        if (recipe) drawIngredient(ctx, recipe.needs[0], cx, cy, 8, false);
      } else {
        drawIngredient(ctx, item.id, cx, cy, 13, item.chopped);
      }
    });
  }

  function drawHighlight(kitchen) {
    const station = nearestStation(kitchen);
    if (!station) return;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    roundRect(ctx, station.rect.x - 4, station.rect.y - 4, station.rect.w + 8, station.rect.h + 8, 10);
    ctx.stroke();
    ctx.setLineDash([]);
    const labels = {
      bin: 'E: grab ingredient', board: 'E: chop / pick up', burner: 'E: add / take dish',
      plate: 'E: plate / pick up', serve: 'E: SERVE!', trash: 'E: trash it',
    };
    // One fixed spot on the floor, so the hint never collides with a pot label.
    text(ctx, labels[station.kind] ?? '', FIELD_W / 2, 600, 15, PALETTE.gold);
  }

  function drawToasts(kitchen) {
    kitchen.events.slice(-3).forEach((event, i) => {
      const alpha = Math.max(0, 1 - event.age / 3.5);
      ctx.globalAlpha = alpha;
      text(ctx, event.text, FIELD_W / 2, 668 - i * 0 + (kitchen.events.slice(-3).length - 1 - i) * -22, 15, PALETTE.cream);
      ctx.globalAlpha = 1;
    });
  }

  function drawHelp() {
    ctx.fillStyle = 'rgba(20,12,6,0.92)';
    roundRect(ctx, 300, 120, 680, 440, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'HOW TO PLAY', 640, 150, 24, PALETTE.gold);
    const lines = [
      'WASD / arrows — move the chef. Click a spot to walk there.',
      'E or Space — use the station in front of you. Q — trash what you carry.',
      '',
      '1. Grab ingredients from the top counter (up to 3 at once).',
      '2. Chop what needs chopping on a board (1.5 s a piece).',
      '3. Drop the recipe\'s ingredients into a pot — it starts cooking.',
      '4. JUGGLE THE BURN: a finished dish burns in 8 seconds. Get it off!',
      '5. Plate it, carry it to the green SERVE window, press E.',
      '',
      'Serve fast for a time bonus. Serves in a row build a combo.',
      'A missed order or a burnt dish breaks the combo (−50 on a miss).',
      '',
      '12 recipes — salads need no burner, everything else does.',
      'M mute · H help · P pause · Enter start',
    ];
    lines.forEach((line, i) => text(ctx, line, 640, 186 + i * 26, 15, PALETTE.cream, 'center', i === 0 || i === 2 ? 'bold' : 'normal'));
  }

  function drawTitle(kitchen, best) {
    drawFloor();
    drawBins();
    drawBoards(kitchen);
    drawStove(kitchen);
    drawPlates(kitchen);
    drawServeAndTrash(kitchen);
    ctx.fillStyle = 'rgba(20,12,6,0.72)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    text(ctx, TITLE, FIELD_W / 2, 190, 56, PALETTE.gold);
    text(ctx, TAGLINE, FIELD_W / 2, 236, 20, PALETTE.cream);
    text(ctx, 'A 90-second service rush in a kitchen of your own.', FIELD_W / 2, 268, 16, '#d8b98a');
    text(ctx, 'Grab · Chop · Cook · Juggle the burn · Plate · Serve', FIELD_W / 2, 320, 18, '#ffffff');
    text(ctx, 'Click or press Enter to start the rush', FIELD_W / 2, 380, 20, PALETTE.gold);
    text(ctx, 'WASD / arrows to move · E to use a station · Q to trash · H for help', FIELD_W / 2, 420, 15, PALETTE.cream);
    if (best > 0) text(ctx, `Best score: ${best}`, FIELD_W / 2, 462, 16, PALETTE.gold);
    text(ctx, '12 recipes · 4 burners · 8 ingredients · one burn clock to beat', FIELD_W / 2, 510, 14, '#d8b98a');
  }

  function drawOver(kitchen, best) {
    drawFloor();
    drawOrderBoard(kitchen);
    drawBins();
    drawBoards(kitchen);
    drawStove(kitchen);
    drawPlates(kitchen);
    drawServeAndTrash(kitchen);
    ctx.fillStyle = 'rgba(20,12,6,0.78)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    text(ctx, 'RUSH COMPLETE', FIELD_W / 2, 170, 48, PALETTE.gold);
    text(ctx, `SCORE  ${kitchen.score}`, FIELD_W / 2, 240, 34, PALETTE.cream);
    text(ctx, `Dishes served: ${kitchen.served}   ·   Orders missed: ${kitchen.missed}   ·   Dishes burnt: ${kitchen.burnt}`, FIELD_W / 2, 292, 17, PALETTE.cream);
    text(ctx, `Best combo: x${kitchen.bestCombo}`, FIELD_W / 2, 326, 17, PALETTE.cream);
    if (kitchen.score >= best && kitchen.score > 0) text(ctx, 'NEW BEST SCORE!', FIELD_W / 2, 366, 20, '#7dff8a');
    else if (best > 0) text(ctx, `Best score: ${best}`, FIELD_W / 2, 366, 18, PALETTE.gold);
    text(ctx, 'Click or press Enter to run the rush again', FIELD_W / 2, 430, 18, PALETTE.cream);
  }

  function draw(kitchen, screen, best, ui) {
    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    if (screen === SCREEN_TITLE) {
      drawTitle(kitchen, best);
    } else if (screen === SCREEN_OVER) {
      drawOver(kitchen, best);
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    } else {
      drawFloor();
      drawOrderBoard(kitchen);
      drawBins();
      drawBoards(kitchen);
      drawStove(kitchen);
      drawPlates(kitchen);
      drawServeAndTrash(kitchen);
      drawHighlight(kitchen);
      drawChef(kitchen);
      drawToasts(kitchen);
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      if (kitchen.paused) {
        ctx.fillStyle = 'rgba(20,12,6,0.6)';
        ctx.fillRect(0, 0, FIELD_W, FIELD_H);
        text(ctx, 'PAUSED — press P to keep cooking', FIELD_W / 2, FIELD_H / 2, 28, PALETTE.cream);
      } else if (ui.help) {
        drawHelp();
      }
    }
  }

  return { draw, toField, burst, updateAnimations };
}
